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
          this.tray.setContextMenu(remote.Menu.buildFromTemplate([
              { label: ptext.content }
            ]));
        },
			  interval: (remaining, ptext) => {
					const time = Duration.fromMillis(remaining * 1000).toFormat('m:ss');
          this.tray.setTitle(time);
        },
			  finish: ptext => {
          new Notification('🍅 Finished!', {
            body: ptext.content
          });

          this.tray.setContextMenu(remote.Menu.buildFromTemplate([
              { label: ptext.content, enabled: false }
            ]));
        },
        cancel: () => {
          this.tray.setTitle('');
          this.tray.setContextMenu(null);
        }
      });
    });
  },

  deactivate() {
    this.tray.destroy();
  }
};
