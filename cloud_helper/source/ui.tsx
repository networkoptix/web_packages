import React, { FC, useEffect, useState } from "react";
import { Box, Text } from "ink";
import { baseMenu, brandColor, MenuNode } from "./config";
import SelectInput from "ink-select-input";
import { v4 as uuid } from "uuid";
import { spawn } from "child_process";
import Spinner from "ink-spinner";
import { exit } from "process";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import TextInput from "ink-text-input";

const goBackLabel = "        Go Back        ";
const cloudHelper = "./cloud_helper.sh";
const goBack = { label: goBackLabel, command: "back", value: [] };

const addKeys = ({ value, ...node }: MenuNode): MenuNode => ({
	...node,
	key: uuid(),
	value: value.map(addKeys),
});

const initialState = addKeys(baseMenu);

const MenuItem = ({ label = "", isSelected = false }) => {
	const text = (
		<Text
			bold={isSelected && label === goBackLabel}
			color={isSelected && label !== goBackLabel ? brandColor : undefined}
			backgroundColor={label === goBackLabel ? "green" : undefined}
		>
			{label}
		</Text>
	);
	return isSelected && label !== goBackLabel ? (
		<>
			<Gradient name="mind">{text}</Gradient>
		</>
	) : (
		text
	);
};

export const App: FC<{ template?: string; name?: string }> = () => {
	const cp = "cloud_portal";
	const [portalDir, isPortalDir] = process.cwd().split(cp);
	const cloudPortalDir = isPortalDir
		? portalDir + cp
		: process.env["CLOUD_PORTAL_DIR"] || "";
	const [menuState, setMenuState] = useState(initialState);
	const [exitMessage, setExitMessage] = useState("");
	const [commandArguments, setCommandArguments] = useState<string>("");
	const [argumentsSelected, setArgumentsSelected] = useState(false);
	const [help, setHelp] = useState(initialState.value?.[0]?.help || "");
	const [gradient, setGradient] = useState([
		"#3f51b1",
		"#5a55ae",
		"#7b5fac",
		"#8f6aae",
		"#a86aa4",
		"#cc6b8e",
		"#f18271",
		"#f3a469",
		"#f7c978",
	]);

	useEffect(() => {
		const last = gradient.pop() || "";
		setGradient([last, ...gradient]);
	}, [menuState, help]);

	const findParent = (key: string, menu: MenuNode = initialState): any =>
		menu.value.find((node) => node.key === key)
			? menu
			: menu.value.find((node) => findParent(key, node));

	if (menuState?.command === "back") {
		const keyToFind = menuState?.key?.split(" ")[0] as string;
		const parent = findParent(keyToFind);
		setTimeout(() => {
			setHelp(parent.value[0]?.help || "");
		}, 10);
		setMenuState(parent);
	} else if (menuState?.command) {
		if (menuState.optionalArgs && !argumentsSelected) {
			return (
				<Box>
					<Box marginRight={1}>
						<Text color={brandColor}>
							Command "{menuState.command}" optional arguments:
						</Text>
					</Box>

					<TextInput
						value={commandArguments}
						onChange={setCommandArguments}
						onSubmit={() => setArgumentsSelected(true)}
					/>
				</Box>
			);
		}
		process.chdir(cloudPortalDir);
		const running = spawn(cloudHelper, [
			`${menuState.command} ${commandArguments}`,
		]);
		running.stdout.on("data", (data) => console.log(data.toString()));
		running.stderr.on("data", (data) => console.error(data.toString()));
		running.on("exit", (code) => {
			setExitMessage(
				`${cloudHelper} ${menuState.command} ran with exit code ${code}`
			);
			exit(code || 0);
		});

		return exitMessage ? (
			<Text color="green">{exitMessage}</Text>
		) : (
			<>
				<Text color="green">Running the following cloud helper command:</Text>
				<Text>
					<Gradient colors={gradient}>
						<Spinner type="bouncingBall" />
					</Gradient>
					<Text
						color={brandColor}
					>{`    ./cloud_helper.sh ${menuState.command}`}</Text>
				</Text>
			</>
		);
	}

	return (
		<>
			<Box padding={1}>
				<Gradient colors={gradient}>
					<BigText text={menuState.label} />
				</Gradient>
			</Box>
			<SelectInput
				items={[
					...menuState.value,
					...(menuState.key !== initialState.key && menuState.value.length
						? [{ ...goBack, key: `${menuState.key} ${uuid()}` }]
						: []),
				]}
				onSelect={(item: MenuNode) => {
					setMenuState(item);
					setHelp(item.value[0]?.help || "");
				}}
				onHighlight={(item: MenuNode) =>
					setHelp(
						`${item.command ? `[ ${cloudHelper} ${item.command} ] - ` : ""}${
							item.help
						}` || ""
					)
				}
				itemComponent={MenuItem}
			></SelectInput>
			<Box padding={1}>
				<Text color="green">{help ? "Help: " : undefined}</Text>
				<Gradient name="passion">
					<Text>{help}</Text>
				</Gradient>
			</Box>
		</>
	);
};
