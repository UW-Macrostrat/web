import {Button, Menu, MenuItem, InputGroup} from "@blueprintjs/core";
import {Select2, ItemRenderer} from "@blueprintjs/select";
import React from "react";
import {useDebouncedCallback} from "use-debounce";

// @ts-ignore
import hyper from "@macrostrat/hyper";

import {OperatorQueryParameter, ColumnOperatorOption} from "./table";

import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/select/lib/css/blueprint-select.css";
import styles from "./edit-table.module.sass";
import {Filter} from "./table-util.ts";


const h = hyper.styled(styles);


const validExpressions: ColumnOperatorOption[] = [
	{key: "eq", value: "=", verbose: "Equals"},
	{key: "lt", value: "<", verbose: "Is less than"},
	{key: "le", value: "<=", verbose: "Is less than or equal to"},
	{key: "gt", value: ">", verbose: "Is greater than"},
	{key: "ge", value: ">=", verbose: "Is greater than or equal to"},
	{key: "ne", value: "<>", verbose: "Is not equal to"},
	{key: "like", value: "LIKE", verbose: "Like"},
	{key: "is", value: "IS", verbose: "Is", placeholder: "true | false | null"},
	{key: "in", value: "IN", verbose: "In", placeholder: "1,2,3"}
]



const OperatorFilterOption: ItemRenderer<ColumnOperatorOption> = (column, { handleClick, handleFocus, modifiers }) => {

	return h(MenuItem, {
		shouldDismissPopover: false,
		active: modifiers.active,
		disabled: modifiers.disabled,
		key: column.key,
		label: column.verbose,
		onClick: handleClick,
		onFocus: handleFocus,
		text: column.value,
		roleStructure:"listoption"
	}, [])
}

interface TableMenuProps {
	onChange: (query: OperatorQueryParameter) => void;
	filter: Filter;
}

const TableMenu = ({onChange, filter} : TableMenuProps) => {

	const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
	const [inputPlaceholder, setInputPlaceholder] = React.useState<string>("");

	// Create a debounced version of the text state
	const [inputValue, setInputValue] = React.useState<string>(filter.value);
	const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		console.log("Its morphin time!")
		setMenuOpen(false);
		onChange({operator: filter.operator, value: e.target.value})
	}
	const debouncedInputChange = useDebouncedCallback(onInputChange, 1000);

	// Set the expression current value from the parent filter
	const selectedExpression = validExpressions.find((expression) => expression.key === filter.operator);

	return h(Menu, {}, [
		h("div.filter-container", {}, [
			h("div.filter-header", {}, ["Filter"]),
			h("div.filter-select", {}, [
				h(Select2<ColumnOperatorOption>, {
					fill: true,
					items: validExpressions,
					className: "update-input-group",
					filterable: false,
					popoverProps: {isOpen: menuOpen},
					itemRenderer: OperatorFilterOption,
					onItemSelect: (operator: ColumnOperatorOption) => {
						setMenuOpen(false);
						setInputPlaceholder(operator.placeholder || "");
						onChange({operator: operator.key, value: filter.value})
					},
					noResults: h(MenuItem, {disabled: true, text: "No results.", roleStructure: "listoption"}, []),
				}, [
					h(Button, {
						fill: true,
						onClick: () => setMenuOpen(!menuOpen),
						alignText: "left",
						text: selectedExpression?.verbose,
						rightIcon: "double-caret-vertical",
						className: "update-input-group",
						placeholder: "Select A Filter"
					}, [])
				]),
			]),
			h("div.filter-input", {}, [
				h(InputGroup, {
					"value": inputValue,
					className: "update-input-group",
					placeholder: inputPlaceholder,
					onChange: (e: React.ChangeEvent<HTMLInputElement>) => {setInputValue(e.target.value); debouncedInputChange(e)}
				}, [])
			])
		])
	])
}

export default TableMenu;