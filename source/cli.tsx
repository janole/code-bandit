#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.js';
import path from 'path';
import { cwd } from 'process';

const cli = meow(
	`
	Usage
	  $ my-ink-cli [path]

	Examples
	  $ my-ink-cli
	  $ my-ink-cli ./some/folder
`,
	{
		importMeta: import.meta,
		argv: process.argv.slice(2),
	},
);

const workDir = path.join(cwd(), cli.input[0] || ".");

render(<App workDir={workDir} />);
