import {Button, MenuItem} from "@blueprintjs/core";
import {Select2, ItemRenderer} from "@blueprintjs/select";
import {EditableCell2Props, EditableCell2, Cell} from "@blueprintjs/table";
import React, {useEffect, useMemo} from "react";

// @ts-ignore
import hyper from "@macrostrat/hyper";

import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/select/lib/css/blueprint-select.css";
import styles from "../../edit-table.module.sass";


const h = hyper.styled(styles);

interface Timescale {
	timescale_id: number
	name: string
}

export interface Interval {
	int_id: number
	name: string
	abbrev: string
	t_age: number
	b_age: number
	int_type: string
	timescales: Timescale[]
	color: string
}

const IntervalOption: ItemRenderer<Interval> = (interval: Interval, { handleClick, handleFocus, modifiers }) => {

	if (interval == null) {
		return h(MenuItem, {
			shouldDismissPopover: false,
			active: modifiers.active,
			disabled: modifiers.disabled,
			key: "",
			label: "",
			onClick: handleClick,
			onFocus: handleFocus,
			text: "",
			roleStructure:"listoption"
		}, [])
	}

	return h(MenuItem, {
		style: {backgroundColor: interval.color},
		shouldDismissPopover: false,
		active: modifiers.active,
		disabled: modifiers.disabled,
		key: interval.int_id,
		label: interval.name,
		onClick: handleClick,
		onFocus: handleFocus,
		text: interval.name,
		roleStructure:"listoption"
	}, [])
}


const IntervalSelection = ({value, onConfirm, intent, ...props} : EditableCell2Props) => {

	const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
	const [intervalValues, setIntervalValues] = React.useState<Interval[]>([]);

	async function getIntervals() {
		let response = await fetch(`https://macrostrat.org/api/defs/intervals?tilescale_id=11`)

		if (response.ok) {
			let response_data = await response.json();
			setIntervalValues(response_data.success.data);
		}
	}

	const interval = useMemo(() => {
		if(intervalValues.length == 0){
			return null
		} else {
			return intervalValues.filter((interval) => interval.int_id == parseInt(value))[0]
		}
	}, [value, intervalValues])

	useEffect(() => {
		getIntervals()
	}, [])

	console.log(interval)

	return h(Cell, {
		style: {padding: 0},
		...props
	}, [
		h(Select2<Interval>, {
			fill: true,
			items: intervalValues,
			className: "update-input-group",
			filterable: false,
			popoverProps: {isOpen: menuOpen},
			itemRenderer: IntervalOption,
			onItemSelect: (interval: Interval) => {
				setMenuOpen(false);
				onConfirm(interval.int_id.toString())
			},
			noResults: h(MenuItem, {disabled: true, text: "No results.", roleStructure: "listoption"}, []),
		}, [
			h(Button, {
				style: {backgroundColor: interval?.color ?? "white", fontSize: "12px", minHeight: "0px", padding: "1.7px 10px", boxShadow: "none"},
				fill: true,
				onClick: () => setMenuOpen(!menuOpen),
				alignText: "left",
				text: interval?.name ?? "Select an Interval",
				rightIcon: "double-caret-vertical",
				className: "update-input-group",
				placeholder: "Select A Filter"
			}, [])
		]),
	])
}


export default IntervalSelection;
