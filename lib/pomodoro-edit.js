'use babel';

import { EditorState } from '@codemirror/state';
import { ipcRenderer } from 'electron';
import { CompositeDisposable } from 'event-kit';
import Core, { getReplacementRange } from '@seachicken/pomodoro-edit-core';

const completionStep = {
  ROOT: 0,
  LOOP: 1,
  TIME: 2
}

let _env;
let _extension;
let _menuDisposable;
let _currentPtext;
let _completionStep = completionStep.ROOT;
let _disposables = new CompositeDisposable();
let _core;

export function activate(env) {
  if (!inkdrop.isMainWindow) return;

  window.addEventListener('unload', () => deactivate());
  _env = env;

  _core = new Core();
  _core.runServer(62115);

  inkdrop.ensureEditorLoaded((editor) => _registerCommands(editor));
}

export function deactivate() {
  if (!inkdrop.isMainWindow) return;

  _unregisterCommands();
  _core.closeServer();
  _core.stopTimer();
}

function _registerCommands(editor) {
  const source = context => context.explicit ? _completionSource(context) : null;
  _extension = EditorState.languageData.of(() => [{
    autocomplete: source
  }]);
  _env.commands.dispatch(document.body, 'editor:add-extension', {
    extension: _extension
  });

  _disposables.add(inkdrop.commands.add(editor.dom, {
    'pomodoro-edit:show-hint': () => {
      _completionStep = completionStep.ROOT;
      _env.commands.dispatch(editor.dom, 'editor:start-completion');
    }
  }));

  _disposables.add(inkdrop.commands.add(document.body, {
    'pomodoro-edit:go-to-line': () => _goToLineToCheckbox(_currentPtext),
    'pomodoro-edit:retry': () => _core.retryLatest(),
    'core:save-note': () => {
      const { editingNote } = inkdrop.store.getState();

      _core.findAndStartTimer(editingNote.body, editingNote._id, {
        start: ptext => {
          _currentPtext = ptext;
          _updateMenuOnStart(ptext);
        },
	      interval: (remainingSec, _, stepNos, symbol, ptext) => {
          _updateMenuOnInterval(remainingSec, stepNos, symbol, ptext);
        },
        step: (stepNos, symbol, ptext) => {
          const blank = symbol || stepNos ? ' ' : '';
          const notification = new Notification('🍅 Go to the next step', {
            body: `${ptext.content}${blank}${symbol}${stepNos ? '#' + stepNos : ''}`
          });
          notification.onclick = () => _goToLineToCheckbox(ptext);
        },
	      finish: ptext => {
          const notification = new Notification('🍅 Finished!', {
            body: ptext.content
          });
          notification.onclick = () => _goToLineToCheckbox(ptext);
        },
        cancel: () => {
          _currentPtext = null;
          _updateMenuOnCancel();
        }
      });
    }
  }));
}

function _unregisterCommands() {
  _env.commands.dispatch(document.body, 'editor:remove-extension', {
    extension: _extension
  });
  _disposables.dispose();
}

function _updateMenuOnStart(ptext) {
  const title = '🍅';
  _configureMenu(title, ptext);
}

function _updateMenuOnInterval(remainingSec, stepNos, symbol, ptext) {
  const title = `🍅 ${_getDisplayTime(remainingSec)}`;
  _configureMenu(title, ptext, stepNos, symbol);
}

function _configureMenu(title, ptext, stepNos, symbol) {
  if (_menuDisposable != null) {
    _menuDisposable.dispose();
  }
  const blank = symbol || stepNos ? ' ' : '';
  _menuDisposable = _env.menu.add([
    { label: title,
      submenu: [
        { label: `${ptext.content}${blank}${symbol || ''}${stepNos ? '#' + stepNos : ''}`, command: 'pomodoro-edit:go-to-line' },
        { label: 'Retry', command: 'pomodoro-edit:retry' }
      ]
    }
  ]);
  _env.menu.update();
}

function _getDisplayTime(timeSec) {
  return `${Math.floor(timeSec / 60)}:${(timeSec % 60).toString().padStart(2, '0')}`;
}

function _goToLineToCheckbox(ptext) {
  _goToLine(ptext, ptext.checkboxOffset);
}

function _goToLine(ptext, ch) {
  ipcRenderer.send('command', 'application:show-and-focus-main-window', {});
  inkdrop.commands.dispatch(document.body, 'core:open-note', { noteId: ptext.id });

  // if you have other notes open, you need to wait for 'core:open-note'
  let cnt = 0;
  const interval = setInterval(() => {
    cnt++;
    const { editingNote } = _env.store.getState();
    const editor = inkdrop.activeEditor;
    if (editor && editingNote?._id === ptext.id) {
      inkdrop.commands.dispatch(document.body, 'editor:focus-mde');

      const line = editor.state.doc.line(ptext.line + 1);
      const pos = line.from + Math.max(0, Math.min(ch, line.length));

      editor.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true
      });

      clearInterval(interval);
      return;
    }
    if (cnt >= 100) clearInterval(interval);
  }, 1)
}

function _updateMenuOnCancel() {
  if (_menuDisposable != null) {
    _menuDisposable.dispose();
  }
}

function _completionSource(context) {
  const bullet = inkdrop.config.settings.editor.unorderedListBullet || '*';
  const pos = context.pos;

  switch (_completionStep) {
    case completionStep.ROOT: {
      const candidates = [
        { label: `${bullet} [ ] [(25m✍️ 5m☕️)] `, nextStep: completionStep.LOOP, cursorOffset: bullet.length + 18 },
        { label: `${bullet} [ ] [-(25m✍️ 5m☕️)] `, nextStep: completionStep.LOOP, cursorOffset: bullet.length + 19 },
        { label: `${bullet} [ ] [m] `, nextStep: completionStep.TIME, cursorOffset: bullet.length + 6 },
        { label: `${bullet} [ ] [-m] `, nextStep: completionStep.TIME, cursorOffset: bullet.length + 7 }
      ];
      return {
        from: pos,
        to: pos,
        options: candidates.map(candidate => ({
          label: candidate.label,
          apply(view, _, from, to) {
            const line = context.state.doc.lineAt(pos);
            const { found, start, end } = getReplacementRange(line.text, { line: line.number - 1, ch: pos - line.from }, bullet);
            if (found) {
              from = context.state.doc.line(start.line + 1).from + start.ch;
              to = context.state.doc.line(end.line + 1).from + end.ch;
            }

            view.dispatch({
              changes: { from, to, insert: candidate.label },
              selection: {
                anchor: from + candidate.cursorOffset
              }
            });
            _completionStep = candidate.nextStep || completionStep.ROOT;

            setTimeout(() => {
              _env.commands.dispatch(view.dom, 'editor:start-completion');
            }, 0);
          }
        }))
      };
    }
    case completionStep.LOOP: {
      const candidates = [ { label: '1' }, { label: '2' }, { label: '3' }, { label: '4' } ];
      const line = context.state.doc.lineAt(pos);
      return {
        from: pos,
        to: pos,
        options: candidates.map(candidate => ({
          label: candidate.label,
          apply(view, _, from, to) {
            view.dispatch({
              changes: { from, to, insert: candidate.label },
              selection: {
                anchor: line.from + line.text.length + candidate.label.length
              }
            });
            _completionStep = completionStep.ROOT;
          }
        }))
      };
    }
    case completionStep.TIME: {
      const candidates = [ { label: '25' }, { label: '20' }, { label: '15' }, { label: '10' }, { label: '5' } ];
      const line = context.state.doc.lineAt(pos);
      return {
        from: pos,
        to: pos,
        options: candidates.map(candidate => ({
          label: candidate.label,
          apply(view, _, from, to) {
            view.dispatch({
              changes: { from, to, insert: candidate.label },
              selection: {
                anchor: line.from + line.text.length + candidate.label.length
              }
            });
            _completionStep = completionStep.ROOT;
          }
        }))
      };
    }
  }
}
