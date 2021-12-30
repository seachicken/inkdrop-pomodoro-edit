# <img src="https://raw.githubusercontent.com/seachicken/pomodoro-edit-core/master/.github/logo.png" align="right" width="100"> Pomodoro Edit for Inkdrop

Pomodoro Timer with simplest text syntax.

![Demonstration](https://github.com//seachicken/inkdrop-pomodoro-edit/blob/master/.github/demo.gif?raw=true)

## Installation

```sh
ipm install pomodoro-edit
```

## Syntax

```md
* [ ] [(p25✍️ p5☕️)4] xxx (four pomodoros 🍅🍅🍅🍅) 
* [ ] [p25] xxx (single timer)
```

💡Ctrl+Space: Autocomplete above syntax

### Start timer

```md
* [ ] [(p25 p5)4] xxx (when after save, start timer)
```

### Finish timer

```md
* [x] [(p25 p5)4] xxx
```

### Pause timer

```md
* [ ] [-(p25 p5)4] xxx
```

### Retry timer

Press 'Retry' button on Tray.

### Go to Line

Press 'Go to Line' button on Tray or click on the finished notification.

## Tips

If multiple timers are required, pause the next timer beforehand so that the timer does not start unintentionally.

```md
* [x] [(p25 p5)4] xxx
* [ ] [-(p25 p5)4] yyy
* [ ] [-(p25 p5)4] zzz
```

## Key customizations

Default keymaps are defined [here](https://github.com/seachicken/inkdrop-pomodoro-edit/blob/master/keymaps/pomodoro-edit.json) and you can override them in your `keymap.cson` file.

## Add-ons

Get e-mail notifications: [seachicken/pomodoro-edit-notifier](https://github.com/seachicken/pomodoro-edit-notifier)

## Changelog

See the [GitHub releases](https://github.com/seachicken/inkdrop-pomodoro-edit/releases) for an overview of what changed in each update.
