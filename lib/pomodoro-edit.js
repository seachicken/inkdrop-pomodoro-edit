'use babel';

import { ipcRenderer } from 'electron';
import CodeMirror from 'codemirror';
import { CompositeDisposable } from 'event-kit';
import Core, { getReplacementRange } from '@seachicken/pomodoro-edit-core';

let _tray;
let _disposables = new CompositeDisposable();
let _core;

export function activate() {
  if (!inkdrop.isMainWindow) return;

  window.addEventListener('unload', () => deactivate());
  _core = new Core();
  _core.runServer(62115);
  if (inkdrop.isEditorActive()) {
    _registerCommands(inkdrop.getActiveEditor());
  }
  inkdrop.onEditorLoad(_registerCommands);
}

export function deactivate() {
  if (!inkdrop.isMainWindow) return;

  _unregisterCommands();
  _core.closeServer();
  _core.stopTimer();
}

function _registerCommands(editor) {
  const { app, Tray } = require('@electron/remote');

  const modulePath = `${app.getAppPath()}/node_modules`;
  require(`${modulePath}/codemirror/addon/hint/show-hint`);

  if (process.platform === 'win32') {
    _tray = new Tray(`${__dirname}/../resources/icon.ico`);
  } else {
    _tray = new Tray(`${__dirname}/../resources/iconTemplate.png`);
  }

  const { cm } = editor;

  const handlers = {
    'pomodoro-edit:show-hint': () => {
      const bullet = inkdrop.config.settings.editor.unorderedListBullet || '*';
      _showPomodoroTextHint(cm, bullet);
    },
    'pomodoro-edit:up-hint': () => {
      const { widget } = cm.state.completionActive;
      widget.changeActive(widget.selectedHint - 1);
    },
    'pomodoro-edit:down-hint': () => {
      const { widget } = cm.state.completionActive;
      widget.changeActive(widget.selectedHint + 1);
    },
    'pomodoro-edit:select-hint': () => {
      const { widget } = cm.state.completionActive;
      widget.pick();
    },
    'pomodoro-edit:close-hint': () => {
      cm.closeHint();
    }
  };
  _disposables.add(inkdrop.commands.add(cm.getWrapperElement(), handlers));

  _disposables.add(inkdrop.commands.add(document.body, "core:save-note", () => {
    const { editingNote } = inkdrop.store.getState();

    _core.findAndStartTimer(editingNote.body, editingNote._id, {
      start: ptext => {
        _updateTrayOnStart(ptext);
      },
	    interval: (remainingSec, _, stepNos, symbol, ptext) => {
        _updateTrayOnInterval(remainingSec, stepNos, symbol, ptext);
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
        _updateTrayOnCancel();
      }
    });
  }));
}

function _unregisterCommands() {
  if (_tray) {
    _tray.destroy();
  }
  _disposables.dispose();
}

function _updateTrayOnStart(ptext) {
  if (_tray.isDestroyed()) return;

  _configureMenu(ptext);
}

function _updateTrayOnInterval(remainingSec, stepNos, symbol, ptext) {
  if (_tray.isDestroyed()) return;

  _configureMenu(ptext, stepNos, symbol);

  const title = _getDisplayTime(remainingSec);
  if (process.platform === 'darwin') {
    _tray.setTitle(title);
  } else {
    _tray.setToolTip(title);
  }
}

function _configureMenu(ptext, stepNos, symbol) {
  const { Menu } = require('@electron/remote');
  const blank = symbol || stepNos ? ' ' : '';
  _tray.setContextMenu(Menu.buildFromTemplate([
      { label: `${ptext.content}${blank}${symbol || ''}${stepNos ? '#' + stepNos : ''}`,
        submenu: [
          { label: 'Go to Line', click: (e) => e !== "change" && _goToLineToCheckbox(ptext) },
          { label: 'Retry', click: (e) => e !== "change" && _core.retryLatest() }
        ]
      }
    ]));
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
    if (inkdrop.isEditorActive() && inkdrop.activeEditor.props.noteId === ptext.id) {
      inkdrop.commands.dispatch(document.body, 'editor:focus-mde');
      inkdrop.activeEditor.cm.setCursor(ptext.line, ch)
      clearInterval(interval);
      return;
    }
    if (cnt >= 100) clearInterval(interval);
  }, 1)
}

function _updateTrayOnCancel() {
  if (_tray.isDestroyed()) return;

  if (process.platform === 'darwin') {
    _tray.setTitle('');
  } else {
    _tray.setToolTip('');
  }
  _tray.setContextMenu(null);
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
