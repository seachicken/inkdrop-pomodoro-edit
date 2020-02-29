'use babel';

import { remote } from 'electron';
import { Duration } from 'luxon';
import Core from 'pomodoro-edit-core';

module.exports = {

  tray: null,

  activate() {
    const core = new Core();
    this.tray = new remote.Tray(`${__dirname}/../resources/iconTemplate.png`);

    inkdrop.commands.add(document.body, "core:save-note", () => {
      const { editingNote } = inkdrop.store.getState();

		  core.findAndCountPomodoroText(editingNote.body, editingNote._id, {
        start: ptext => {
          _updateTrayOnStart(this.tray, ptext);
        },
			  interval: (remaining, ptext) => {
          _updateTrayOnInterval(this.tray, remaining, ptext);
        },
			  finish: ptext => {
          new Notification('🍅 Finished!', {
            body: ptext.content
          });

          _updateTrayOnFinish(this.tray, ptext);
        },
        cancel: () => {
          _updateTrayOnCancel(this.tray);
        }
      });
    });
  },

  deactivate() {
    this.tray.destroy();
  },
};

function _updateTrayOnStart(tray, ptext) {
  tray.setContextMenu(remote.Menu.buildFromTemplate([
      { label: ptext.content }
    ]));
}

function _updateTrayOnInterval(tray, remaining, ptext) {
  const time = Duration.fromMillis(remaining * 1000).toFormat('m:ss');
  if (process.platform === 'darwin') {
    tray.setTitle(time);
  } else {
    tray.setToolTip(`${ptext.content} (${time})`);
  }
}

function _updateTrayOnFinish(tray, ptext) {
  tray.setContextMenu(remote.Menu.buildFromTemplate([
      { label: ptext.content, enabled: false }
    ]));
}

function _updateTrayOnCancel(tray) {
  if (process.platform === 'darwin') {
    tray.setTitle('');
  } else {
    tray.setToolTip('');
  }
  tray.setContextMenu(null);
}
