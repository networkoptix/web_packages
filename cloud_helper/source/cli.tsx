#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { App } from "./ui";

const cli = meow(
	`
	Usage
	  $ cloud-helper
`
);

render(<App {...cli.flags} />);
