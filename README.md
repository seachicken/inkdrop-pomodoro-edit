# <img src="https://raw.githubusercontent.com/seachicken/pomodoro-edit-core/master/.github/logo.png" align="right" width="100"> Pomodoro Edit for Inkdrop

Pomodoro Timer with simplest text syntax.

![Demonstration](https://github.com//seachicken/inkdrop-pomodoro-edit/blob/master/.github/demo.gif?raw=true)

## Installation

```sh
ipm install pomodoro-edit
```

## Examples

```md
# four pomodoros
* [ ] [(25m✍️ 5m☕️)4] xxx

# four pomodoros and then take a long break
* [ ] [((25m✍️ 5m☕️)4 20m🛌)] xxx

# single timer
* [ ] [25m] xxx
```

[Syntax details](https://github.com/seachicken/pomodoro-edit-core#syntax)

💡Ctrl+Space: Autocomplete above syntax

### Start timer

```md
* [ ] [(25m 5m)4] xxx (when after save, start timer)
```

### Finish timer

```md
* [x] [(25m 5m)4] xxx
```

### Pause timer

```md
* [ ] [-(25m 5m)4] xxx
```

### Retry timer

Press 'Retry' button on Tray.

### Go to Line

Press 'Go to Line' button on Tray or click on the finished notification.

## Tips

If multiple timers are required, pause the next timer beforehand so that the timer does not start unintentionally.

```md
* [x] [(25m 5m)4] xxx
* [ ] [-(25m 5m)4] yyy
* [ ] [-(25m 5m)4] zzz
```

## Key customizations

Default keymaps are defined [here](https://github.com/seachicken/inkdrop-pomodoro-edit/blob/master/keymaps/pomodoro-edit.json) and you can override them in your `keymap.cson` file.

## Add-ons

Get e-mail notifications: [seachicken/pomodoro-edit-notifier](https://github.com/seachicken/pomodoro-edit-notifier)

## Changelog

See the [GitHub releases](https://github.com/seachicken/inkdrop-pomodoro-edit/releases) for an overview of what changed in each update.
