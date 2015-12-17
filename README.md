# WebMod

WebMod is an audio player for tracker modules (such as MOD, S3M, XM and IT)
written in TypeScript. This is a pre-alpha version of WebMod for testing only.
It currently only works with a few MOD and XM files, best without any effects.
Most effects are not implemented or not working correctly yet.


## Compiling

WebMod is written in [TypeScript](http://www.typescriptlang.org) and
needs to be compiled to JavaScript in order to run in a browser.
Follow [these instructions](https://www.npmjs.com/package/typescript) to
install the TypeScript compiler (tsc) on your machine. Now you can run the
following command in the project directory to compile everything:

    $ tsc

It compiles the TypeScript files within the src directory into a single file,
webmod.js.


## Usage

Include webmod.js:

~~~HTML
<script src="webmod.js"></script>
~~~


JavaScript:

~~~JavaScript
var data = new Uint8Array(...);
var mod = new WebMod.Module(data);
mod.start();
...
mod.stop();
~~~


## Browser Support

WebMod is based on the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API),
which is only supported on modern web browsers. However, if your browser supports
the Web Audio API, this does not imply that WebMod runs on it. Here is a list
of browsers and the status:

Browser | Status
--------|-------
Chromium 47 | Works fine.
Firefox 43 | Works fine.
Opera | Not tested.
Safari | Not tested.
Edge | Not tested.
Internet Explorer | Should not work, as the Web Audio API is not available.
Mobile Browsers | To be tested.


## Module Support

Currently only MOD and XM files are loaded. Most files I tested were *loaded*
correctly (this does not imply correct playback yet).

As for the playback, MOD and XM generally work, but all XM files still sound
kinda disturbed (like clipped sound samples or something).


### Effects

Effect | MOD | XM | S3M | IT | Status
-------|-----|----|-----|----|-------
Set Global Volume | - | Gxx | Vxx | Vxx | Not implemented.
Global Volume Slide | - | - | Wxy | Wxy | Not implemented.
Global Volume Slide Down | - | H0x | - | - | Not implemented.
Global Volume Slide Up | - | Hx0 | - | - | Not implemented.
Set Speed | - | - | Axx | Axx | Not implemented.
Set Speed / Tempo | Fxx | Fxx | - | - | **Implemented.**
Set Tempo | - | - | Txx | Txx | Not implemented.
Decrease Tempo | - | - | T0x | T0x | Not implemented.
Increase Tempo | - | - | T1x | T1x | Not implemented.
Pattern Delay | EEx | EEx | SEx | SEx | **Implemented.**
Position Jump | Bxx | Bxx | Bxx | Bxx | **Implemented.**
Pattern Break | Dxx | Dxx | Cxx | Cxx | **Implemented.**
Pattern Loop Start | E60 | E60 | SB0 | SB0 | Not implemented.
Pattern Loop | E6x | E6x | SBx | SBx | Not implemented.
Fine Pattern Delay | - | X6x | S6x | S6x | Not implemented.
Set Channel Volume | - | - | Mxx | Mxx | Not implemented.
Channel Volume Slide | - | - | Nxy | Nxy | Not implemented.
Set Panning | 8xx | 8xx | S8x | S8x | Not implemented.
Set Panning | E8x | E8x | Xxx | Xxx | Not implemented.
Surround | - | - | XA4 | XA4 | Not implemented.
Set Volume | Cxx | Cxx | - | - | *Implemented. Further testing required.*
Note Cut | ECx | ECx | SCx | SCx | Not implemented.
Note Delay | EDx | EDx | SDx | SDx | Not implemented.
Sample Offset | 9xx | 9xx | Oxx | Oxx | Not implemented.
Arpeggio | 0xy | 0xy | Jxy | Jxy | Not implemented.
Portamento Up | 1xx | 1xx | Fxx | Fxx | *Partly implemented.*
Portamento Down | 2xx | 2xx | Exx | Exx | *Partly implemented.*
Tone Portamento | 3xx | 3xx | Gxx | Gxx | *Partly implemented.*
Vibrato | 4xy | 4xy | Hxy | Hxy | *Partly implemented.*
Volume Slide + Tone Portamento | 5xy | 5xy | Lxy | Lxy | Not implemented.
Volume Slide + Vibrato | 6xy | 6xy | Kxy | Kxy | Not implemented.
Tremolo | 7xy | 7xy | Rxy | Rxy | Not implemented.
Volume Slide Down | A0x | A0x | D0x | D0x | Not implemented.
Volume Slide Up | Ax0 | Ax0 | Dx0 | Dx0 | Not implemented.
Fine Portamento Up | E1x | E1x | FFx | FFx | Not implemented.
Fine Portamento Down | E2x | E2x | EFx | EFx | Not implemented.
Glissando Control | E3x | E3x | S1x | S1x | Not implemented.
Set Vibrato Waveform | E4x | E4x | S3x | S3x | Not implemented.
Set Finetune | E5x | E5x | S2x | S2x | Not implemented.
Tremolo Waveform | E7x | E7x | S4x | S4x | Not implemented.
Retrigger | E9x | E9x | - | - | Not implemented.
Fine Volume Slide Up | EAx | EAx | DxF | DxF | Not implemented.
Fine Volume Slide Down | EBx | EBx | DFx | DFx | Not implemented.
Invert Loop | EFx | - | - | - | Not implemented.
Set Active Macro | - | EFx | - | - | Not implemented.
Key Off | - | Kxx | - | - | Not implemented.
Envelope Position | - | Lxx | - | - | Not implemented.
Panning Slide Left | - | P0x | Px0 | Px0 | Not implemented.
Panning Slide Right | - | Px0 | P0x | P0x | Not implemented.
Retrigger | - | Rxy | Qxy | Qxy | Not implemented.
Tremor | - | Txy | Ixy | Ixy | Not implemented.
Extra Fine Porta Up | - | X1x | FEx | FEx | Not implemented.
Extra Fine Porta Down | - | X2x | EEx | EEx | Not implemented.
Panbrello Waveform | - | X5x | S5x | S5x | Not implemented.
Sound Control | - | X9x | S9x | S9x | Not implemented.
High Offset | - | Xax | SAx | SAx | Not implemented.
Panbrello | - | Yxy | Yxy | Yxy | Not implemented.
MIDI Macro | - | Zxx | Zxx | Zxx | Not implemented.
Smooth MIDI Macro | - | \xx | - | \xx | Not implemented.
Fine Panning Slide Right | - | - | PFx | PFx | Not implemented.
Fine Panning Slide Left | - | - | PxF | PxF | Not implemented.
Special Commands | - | - | S00 | S00 | Not implemented.
Fine Vibrato | - | - | Uxy | Uxy | Not implemented.
Past Note Cut  | - | - | - | S70  | Not implemented.
Past Note Off  | - | - | - | S71  | Not implemented.
Past Note Fade  | - | - | - | S72  | Not implemented.
NNA Note Cut  | - | - | - | S73  | Not implemented.
NNA Note Continue  | - | - | - | S74  | Not implemented.
NNA Note Off  | - | - | - | S75  | Not implemented.
NNA Note Fade  | - | - | - | S76  | Not implemented.
Volume Envelope Off  | - | - | - | S77  | Not implemented.
Volume Envelope On  | - | - | - | S78  | Not implemented.
Pan Envelope Off  | - | - | - | S79  | Not implemented.
Pan Envelope On  | - | - | - | S7A  | Not implemented.
Pitch Envelope Off  | - | - | - | S7B  | Not implemented.
Pitch Envelope On  | - | - | - | S7C  | Not implemented.


## TO DO

 - Implement all the effects available
 - Support for loading more MOD and XM files
 - Support for S3M and IT files
 - Convert the module class to an AudioNode (if possible)
 - And many more features...


## License

Please refer to the *LICENSE* file.