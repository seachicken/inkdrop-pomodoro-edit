'use babel';

import { remote } from 'electron';
import CodeMirror from 'codemirror';
import { CompositeDisposable } from 'event-kit';
import { Duration } from 'luxon';
import Core from 'pomodoro-edit-core';

let _tray;
let _disposables = new CompositeDisposable();

export function activate() {
  if (!inkdrop.isMainWindow) return;

  window.addEventListener('unload', () => deactivate());

  const modulePath = `${remote.app.getAppPath()}/node_modules`;
  require(`${modulePath}/codemirror/addon/hint/show-hint`);

  _registerCommands();
  if (process.platform === 'win32') {
    _tray = new remote.Tray(`${__dirname}/../resources/icon.ico`);
  } else {
    _tray = new remote.Tray(`${__dirname}/../resources/iconTemplate.png`);
  }
}

export function deactivate() {
  if (!inkdrop.isMainWindow) return;

  _tray.destroy();
  _unregisterCommands();
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

  const core = new Core();
  _disposables.add(inkdrop.commands.add(document.body, "core:save-note", () => {
    const { editingNote } = inkdrop.store.getState();

    core.findAndCountPomodoroText(editingNote.body, editingNote._id, {
      start: ptext => {
        _updateTrayOnStart(ptext);
      },
	    interval: remaining => {
        _updateTrayOnInterval(remaining);
      },
	    finish: ptext => {
        new Notification('🍅 Finished!', {
          body: ptext.content
        });

        _updateTrayOnFinish(ptext);
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
  _tray.setContextMenu(remote.Menu.buildFromTemplate([
      { label: ptext.content }
    ]));
}

function _updateTrayOnInterval(remaining) {
  // TODO: Remove next line when core implemented stopping timer
  if (_tray.isDestroyed()) return;

  const time = Duration.fromMillis(remaining * 1000).toFormat('m:ss');
  if (process.platform === 'darwin') {
    _tray.setTitle(time);
  } else {
    _tray.setToolTip(time);
  }
}

function _updateTrayOnFinish(ptext) {
  // TODO: Remove next line when core implemented stopping timer
  if (_tray.isDestroyed()) return;

  _tray.setContextMenu(remote.Menu.buildFromTemplate([
      { label: ptext.content, enabled: false }
    ]));
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
    { text: `${bullet} [ ] [p] ` },
    { text: `${bullet} [p] ` },
    { text: '[p] ' }
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
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 7));
            break;
          case candidates[1].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + bullet.length + 3));
            break;
          case candidates[2].text:
            cm.setCursor(CodeMirror.Pos(pos.line, pos.ch + 2));
            break;
        }
        _showTimeHint(cm);
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
