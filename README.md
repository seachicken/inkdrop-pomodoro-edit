# <img src="https://raw.githubusercontent.com/seachicken/pomodoro-edit-core/master/.github/logo.png" align="right" width="100"> Pomodoro Edit for Inkdrop

Pomodoro Timer with simplest text syntax for Inkdrop.

![Demonstration](https://github.com//seachicken/inkdrop-pomodoro-edit/blob/master/.github/demo.gif?raw=true)

## Installation

```sh
ipm install pomodoro-edit
```

## Syntax

```md
* [ ] [p25] xxx (supported unordered list bullet are '*' and '-')
  * [ ] [p25] xxx
```

💡Ctrl+Cmd+P / Ctrl+Alt+P: Autocomplete above syntax

### Start timer

```md
* [ ] [p25] xxx (when after save, start timer)
```

### Finish timer

```md
* [x] [p25] xxx
```

### Pause timer

```md
* [ ] [-p25] xxx
```

### Retry timer

Press 'Retry' button on Tray.

### Go to Line

Press 'Go to Line' button on Tray or click on the finished notification.

## Tips

If multiple timers are required, pause the next timer beforehand so that the timer does not start unintentionally.

```md
* [x] [p25] xxx
* [ ] [-p25] yyy
* [ ] [-p25] zzz
```

If you're using the [vim](https://my.inkdrop.app/plugins/vim) plugin and the autocomplete hint doesn't close, add the below keymap in your `keymap.cson` file.

```cson
  ".CodeMirror textarea.visible-hint": {
    "escape": "pomodoro-edit:close-hint"
  }
```

## Key customizations

Default keymaps are defined [here](https://github.com/seachicken/inkdrop-pomodoro-edit/blob/master/keymaps/pomodoro-edit.json) and you can override them in your `keymap.cson` file.

## Changelog

See the [GitHub releases](https://github.com/seachicken/inkdrop-pomodoro-edit/releases) for an overview of what changed in each update.
