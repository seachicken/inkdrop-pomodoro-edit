# <img src="https://raw.githubusercontent.com/seachicken/pomodoro-edit-core/master/.github/logo.png" align="right" width="100"> Pomodoro Edit for Inkdrop

Pomodoro Timer with simplest text syntax for Inkdrop.

![Demonstration](https://github.com//seachicken/inkdrop-pomodoro-edit/blob/master/.github/demo.gif?raw=true)

## Installation

```sh
ipm install pomodoro-edit
```

## Usage

```md
## Syntax

* [ ] [p25] xxx (supported unordered list bullet are '*' and '-')
  * [ ] [p25] xxx

💡Ctrl+Cmd+P/Ctrl+Alt+P: autocomplete above syntax


## Operation

Start timer:

* [ ] [p25] xxx (when after save, start timer)

Finish timer:

* [x] [p25] xxx

Pause timer:

* [ ] [-p25] xxx

Retry timer:

press 'Retry' button on Tray

Go to Line:

press 'Go to Line' button on Tray or click on the finished notification


## Tips

if multiple timers are required, pause the next timer beforehand so that the timer does not start unintentionally

* [x] [p25] xxx
* [ ] [-p25] yyy
* [ ] [-p25] zzz
```

## Key customizations

Default keymaps are defined [here](https://github.com/seachicken/inkdrop-pomodoro-edit/blob/master/keymaps/pomodoro-edit.json) and you can override them in your `keymap.cson` file.

## Changelog

See the [GitHub releases](https://github.com/seachicken/inkdrop-pomodoro-edit/releases) for an overview of what changed in each update.
