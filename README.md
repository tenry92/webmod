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