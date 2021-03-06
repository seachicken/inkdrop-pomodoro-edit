'use babel';

import { remote, ipcRenderer } from 'electron';
import CodeMirror from 'codemirror';
import { CompositeDisposable } from 'event-kit';
import { Duration } from 'luxon';
import Core from 'pomodoro-edit-core';

let _tray;
let _disposables = new CompositeDisposable();
let _core;

export function activate() {
  if (!inkdrop.isMainWindow) return;

  window.addEventListener('unload', () => deactivate());

  const modulePath = `${remote.app.getAppPath()}/node_modules`;
  require(`${modulePath}/codemirror/addon/hint/show-hint`);

  if (process.platform === 'win32') {
    _tray = new remote.Tray(`${__dirname}/../resources/icon.ico`);
  } else {
    _tray = new remote.Tray(`${__dirname}/../resources/iconTemplate.png`);
  }
  _core = new Core();
  _registerCommands();
}

export function deactivate() {
  if (!inkdrop.isMainWindow) return;

  _unregisterCommands();
  _core.stopTimer();
  _tray.destroy();
}

function _registerCommands() {
  inkdrop.onEditorLoad(editor => {
    const { cm } = editor;

    const handlers = {
      'pomodoro-edit:show-hint': () => {
        const bullet = inkdrop.config.settings.editor.unorderedListBullet;
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
  });

  _disposables.add(inkdrop.commands.add(document.body, "core:save-note", () => {
    const { editingNote } = inkdrop.store.getState();

    _core.findAndStartTimer(editingNote.body, editingNote._id, {
      start: ptext => {
        _updateTrayOnStart(ptext);
      },
	    interval: (remainingSec, _, stepNos, ptext) => {
        _updateTrayOnInterval(remainingSec, stepNos, ptext);
      },
      step: ptext => {
        const notification = new Notification('🍅 Go to the next step', {
          body: ptext.content
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
  _disposables.dispose();
}

function _updateTrayOnStart(ptext) {
  _configureMenu(ptext);
}

function _updateTrayOnInterval(remainingSec, stepNos, ptext) {
  _configureMenu(ptext, stepNos);

  const title = _getDisplayTime(remainingSec);
  if (process.platform === 'darwin') {
    _tray.setTitle(title);
  } else {
    _tray.setToolTip(title);
  }
}

function _configureMenu(ptext, stepNos) {
  _tray.setContextMenu(remote.Menu.buildFromTemplate([
      { label: `${ptext.content}${stepNos ? ' #' + stepNos : ''}`,
        submenu: [
          { label: 'Go to Line', click: () => _goToLineToCheckbox(ptext) },
          { label: 'Retry', click: () => _core.retryLatest() }
        ]
      }
    ]));
}

function _getDisplayTime(timeSec) {
  return Duration.fromMillis(timeSec * 1000).toFormat('m:ss');
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
    if (inkdrop.activeEditor.props.noteId === ptext.id) {
      inkdrop.commands.dispatch(document.body, 'editor:focus-mde');
      inkdrop.activeEditor.cm.setCursor(ptext.line, ch)
      clearInterval(interval);
      return;
    }
    if (cnt >= 100) clearInterval(interval);
  }, 1)
}

function _updateTrayOnCancel() {
  if (process.platform === 'darwin') {
    _tray.setTitle('');
  } else {
    _tray.setToolTip('');
  }
  _tray.setContextMenu(null);
}

function _showPomodoroTextHint(cm, bullet) {
  const candidates = [
    { text: `${bullet} [ ] [(p25 p5)] ` },
    { text: `${bullet} [ ] [-(p25 p5)] ` },
    { text: `${bullet} [ ] [p] ` },
    { text: `${bullet} [ ] [-p] ` }
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
        switch (item.text) {
          case candidates[0].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 14));
            _showLoopHint(cm);
            break;
          case candidates[1].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 15));
            _showLoopHint(cm);
            break;
          case candidates[2].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 7));
            _showTimeHint(cm);
            break;
          case candidates[3].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 8));
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
