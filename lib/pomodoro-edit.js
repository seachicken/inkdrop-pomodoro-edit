'use babel';

import { ipcRenderer } from 'electron';
import { CompositeDisposable } from 'event-kit';
import Core, { getReplacementRange } from '@seachicken/pomodoro-edit-core';

let _env;
let _menuDisposable;
let _currentPtext;
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
  const { cm } = editor;

  //const handlers = {
  //  'pomodoro-edit:show-hint': () => {
  //    const bullet = inkdrop.config.settings.editor.unorderedListBullet || '*';
  //    _showPomodoroTextHint(cm, bullet);
  //  },
  //  'pomodoro-edit:up-hint': () => {
  //    const { widget } = cm.state.completionActive;
  //    widget.changeActive(widget.selectedHint - 1);
  //  },
  //  'pomodoro-edit:down-hint': () => {
  //    const { widget } = cm.state.completionActive;
  //    widget.changeActive(widget.selectedHint + 1);
  //  },
  //  'pomodoro-edit:select-hint': () => {
  //    const { widget } = cm.state.completionActive;
  //    widget.pick();
  //  },
  //  'pomodoro-edit:close-hint': () => {
  //    cm.closeHint();
  //  }
  //};
  //_disposables.add(inkdrop.commands.add(cm.getWrapperElement(), handlers));

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
    if (editingNote?._id === ptext.id) {
      inkdrop.commands.dispatch(document.body, 'editor:focus-mde');
      inkdrop.activeEditor.cm.setCursor(ptext.line, ch)
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

function _showPomodoroTextHint(cm, bullet) {
  const candidates = [
    { text: `${bullet} [ ] [(25m✍️ 5m☕️)] ` },
    { text: `${bullet} [ ] [-(25m✍️ 5m☕️)] ` },
    { text: `${bullet} [ ] [m] ` },
    { text: `${bullet} [ ] [-m] ` }
  ];

  cm.showHint({
    hint: () => {
      const pos = cm.getCursor();
      const result = {
        list: candidates,
        from: pos,
        to: pos
      };

      CodeMirror.on(result, 'shown', () => {
        cm.display.input.textarea.classList.add('visible-hint');
      });
      CodeMirror.on(result, 'close', () => {
        cm.display.input.textarea.classList.remove('visible-hint');
      });
      CodeMirror.on(result, 'pick', item => {
        const { found, start, end } = getReplacementRange(cm.doc.getLine(pos.line), pos, bullet);
        let deleteCnt = 0;
        if (found) {
          cm.doc.replaceRange('', {line: start.line, ch: start.ch}, {line: end.line, ch: end.ch});
          deleteCnt = end.ch - start.ch;
        }

        switch (item.text) {
          case candidates[0].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 18 - deleteCnt));
            _showLoopHint(cm);
            break;
          case candidates[1].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 19 - deleteCnt));
            _showLoopHint(cm);
            break;
          case candidates[2].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 6 - deleteCnt));
            _showTimeHint(cm);
            break;
          case candidates[3].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 7 - deleteCnt));
            _showTimeHint(cm);
            break;
        }
      });

      return result;
    }
  });

  _removeDefaultKeyMap(cm);
}

function _showLoopHint(cm) {
  const candidates = [ { text: '1' }, { text: '2' }, { text: '3' }, { text: '4' } ];

  cm.showHint({
    hint: () => {
      const pos = cm.getCursor();
      const result = {
        list: candidates,
        from: pos,
        to: pos
      };

      CodeMirror.on(result, 'shown', () => {
        cm.display.input.textarea.classList.add('visible-hint');
      });
      CodeMirror.on(result, 'close', () => {
        cm.display.input.textarea.classList.remove('visible-hint');
      });
      CodeMirror.on(result, 'pick', () => {
        cm.setCursor(CodeMirror.Pos(pos.line, cm.getLine(pos.line).length));
      });
      
      return result;
    }
  });

  _removeDefaultKeyMap(cm);
}

function _showTimeHint(cm) {
  const candidates = [ { text: '25' }, { text: '20' }, { text: '15' }, { text: '10' }, { text: '5' } ];

  cm.showHint({
    hint: () => {
      const pos = cm.getCursor();
      const result = {
        list: candidates,
        from: pos,
        to: pos
      };

      CodeMirror.on(result, 'shown', () => {
        cm.display.input.textarea.classList.add('visible-hint');
      });
      CodeMirror.on(result, 'close', () => {
        cm.display.input.textarea.classList.remove('visible-hint');
      });
      CodeMirror.on(result, 'pick', () => {
        cm.setCursor(CodeMirror.Pos(pos.line, cm.getLine(pos.line).length));
      });
      
      return result;
    }
  });

  _removeDefaultKeyMap(cm);
}

// remove default keymap by show-hint.js
function _removeDefaultKeyMap(cm) {
  const { widget } = cm.state.completionActive;
  cm.removeKeyMap(widget.keyMap);
}
