'use babel';

import { remote } from 'electron';
import { Duration } from 'luxon';
import Core from 'pomodoro-edit-core';

let _tray = null;

export function activate() {
  if (!inkdrop.isMainWindow) return;

  window.addEventListener('unload', () => deactivate());

  if (process.platform === 'win32') {
    _tray = new remote.Tray(`${__dirname}/../resources/icon.ico`);
  } else {
    _tray = new remote.Tray(`${__dirname}/../resources/iconTemplate.png`);
  }

  inkdrop.commands.add(document.body, "core:save-note", () => {
    const { editingNote } = inkdrop.store.getState();

    const core = new Core();
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
  });
}

export function deactivate() {
  if (!inkdrop.isMainWindow) return;

  _tray.destroy();
}

function _updateTrayOnStart(ptext) {
  _tray.setContextMenu(remote.Menu.buildFromTemplate([
      { label: ptext.content }
    ]));
}

function _updateTrayOnInterval(remaining) {
  const time = Duration.fromMillis(remaining * 1000).toFormat('m:ss');
  if (process.platform === 'darwin') {
    _tray.setTitle(time);
  } else {
    _tray.setToolTip(time);
  }
}

function _updateTrayOnFinish(ptext) {
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
