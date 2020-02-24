'use babel';

import * as React from 'react';
import { CompositeDisposable } from 'event-kit';

export default class InkdropPomodoroEditMessageDialog extends React.Component {

  componentWillMount () {
    // Events subscribed to in Inkdrop's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this dialog
    this.subscriptions.add(inkdrop.commands.add(document.body, {
      'inkdrop-pomodoro-edit:toggle': () => this.toggle()
    }));
  }

  componentWillUnmount () {
    this.subscriptions.dispose();
  }

  render() {
    const { MessageDialog } = inkdrop.components.classes;
    return (
      <MessageDialog ref='dialog' title='InkdropPomodoroEdit'>
        InkdropPomodoroEdit was toggled!
      </MessageDialog>
    );
  }

  toggle() {
    console.log('InkdropPomodoroEdit was toggled!');
    const { dialog } = this.refs;
    if (!dialog.isShown) {
      dialog.showDialog();
    } else {
      dialog.dismissDialog();
    }
  }
}
