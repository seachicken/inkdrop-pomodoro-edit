'use babel';

import InkdropPomodoroEditMessageDialog from './inkdrop-pomodoro-edit-message-dialog';

module.exports = {

  activate() {
    inkdrop.components.registerClass(InkdropPomodoroEditMessageDialog);
    inkdrop.layouts.addComponentToLayout(
      'modal',
      'InkdropPomodoroEditMessageDialog'
    )
  },

  deactivate() {
    inkdrop.layouts.removeComponentFromLayout(
      'modal',
      'InkdropPomodoroEditMessageDialog'
    )
    inkdrop.components.deleteClass(InkdropPomodoroEditMessageDialog);
  }

};
