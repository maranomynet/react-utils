/** @jsx createElement */
import {
	createElement,
	useState,
	useMemo,
	CSSProperties,
	ReactNode,
	ReactElement,
	useRef,
	RefObject,
	useEffect,
} from 'react';
import getModifierClass from './utils/getModifierClass';
import getBemClass from './utils/getBemClass';
import { BemProps } from './types';
import { useIsBrowserSide } from './hooks';
import { OptionOrValue, getVisibleLabel, getOptionLabel } from './Selectbox.privates';

const hiddenSelectStyles: CSSProperties = {
	opacity: 0.0001,
	position: 'absolute',
	bottom: 0,
	left: 0,
	width: '100%',
	height: '100%',
	// unset existing styles°
	top: 'auto',
	right: 'auto',
	margin: 0,
	padding: 0,
	border: 0,
};

export interface SelectboxOption<V extends string | number = string | number> {
	value: V;
	label?: string;
	disabled?: boolean;
}
export type SelectboxOptions<V extends string | number = string | number> = Array<
	SelectboxOption<V>
>;

// ---------------------------------------------------------------------------

export type SelectboxProps<
	O extends OptionOrValue = OptionOrValue,
	V = O extends SelectboxOption ? O['value'] : O
> = {
	/** Class-name for the <span> wrapper around the <select> */
	className?: string;
	options: ReadonlyArray<O>;
	value?: string | V;
	defaultValue?: string | V;
	/** Generates a <option value="" /> at the start of the select's option list */
	placeholder?: string;
	placeholderDisabled?: boolean;
	/**
	 * Sugar alternative to `onChange`.
	 *
	 * If placeholder option was selected, then `value === undefined`
	 */
	onSelected?: (value?: V, option?: O) => void;
	ssr?: boolean | 'ssr-only';
	/**
	 * Custom visual label formatter.
	 *
	 * NOTE: The formatter is only called for non-empty labels
	 * in order to make a `<Selectbox/>`'s "visibly empty" status more predictably
	 * inferrable by reading `selectRef.current?.selectedOptions[0].textContent`
	 */
	visibleFormat?: (selected: O) => NonNullable<ReactNode>;
	/** Ref object that points to the native <select/> element */
	selectRef?: RefObject<HTMLSelectElement>;
} & BemProps &
	Omit<
		JSX.IntrinsicElements['select'],
		'value' | 'defaultValue' | 'multiple' | 'className'
	>;
/* * /
	// NOTE: This **should** work but for some reason it doesn't
	// As soon as I skip the optional `placeholder` prop
	// (making it implicitly undefined) TS immediately stops recognizing
	// `onSelected` and decides it must be `(any) => any`
	& (
		| {
				placeholder?: undefined;
				onSelected?: (value: V, option: O) => void;
		  }
		| {
				placeholder: string;
				onSelected?: (value?: V, option?: O) => void;
		  });

const _Testing_ = () => (
	<>
		<Selectbox
			options={[1, 2, 3]}
			placeholder={undefined}
			onSelected={(value, option) => {}}
		/>
		<Selectbox
			options={[1, 2, 3]}
			placeholder="Pick one"
			onSelected={(value, option) => {}}
		/>
		// This fails!
		<Selectbox
			options={[1, 2, 3]}
			onSelected={(value, option) => {}}
		/>
	</>
);
/**/

// ---------------------------------------------------------------------------

/** Sugar wrapper for standard `<select/>` elements offering more fancy styling */
const Selectbox = <O extends OptionOrValue>(props: SelectboxProps<O>): ReactElement => {
	const [focused, setFocused] = useState(false);
	const _selectRef = useRef<HTMLSelectElement>(null);

	const {
		className,
		bem = 'Selectbox',
		modifier,
		value,
		defaultValue,
		options,
		visibleFormat,
		ssr,
		onSelected,
		onChange,
		placeholder,
		selectRef = _selectRef,
		...selectProps
	} = props;

	const isBrowser = useIsBrowserSide(ssr);

	const optionsNorm = useMemo(
		() =>
			options.map((item) =>
				typeof item === 'string' || typeof item === 'number' ? { value: item } : item
			),
		[options]
	) as SelectboxOptions<O extends SelectboxOption ? O['value'] : O>; // Feck!

	const [currVal, setCurrVal] = useState(() => (value != null ? value : defaultValue));

	// TODO: DECIDE: Handle value="" and options array that doesn't include that value. What to do???
	// Should we auto-generate option and push it to the bottom of the list?

	const selectedOptionText = useMemo(
		() => getVisibleLabel(options, currVal, placeholder, visibleFormat),
		[currVal, options, placeholder, visibleFormat]
	);

	const hasPlaceholder = placeholder != null;
	useEffect(
		() => {
			// capture if browser (or React's <select> handling) auto-selected something
			// unexpected becasue of disabled first option...
			// or if the value and options don't match up, then set currVal to something
			// that's actually available.
			// NOTE: When setCurrVal() sets a value that's the same as the current currVal
			// then no re-redering occurs.
			if (value == null) {
				selectRef.current && setCurrVal(selectRef.current.value);
				return;
			}
			if (value === '' && hasPlaceholder) {
				setCurrVal('');
				return;
			}
			if (optionsNorm.find((o) => o.value === value)) {
				setCurrVal(value);
				return;
			}
			if (hasPlaceholder) {
				setCurrVal('');
				return;
			}
			setCurrVal(optionsNorm[0]?.value ?? '');
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[value, optionsNorm, hasPlaceholder]
	);

	const selectElmClass = isBrowser
		? undefined
		: bem
		? getBemClass(bem, modifier, className)
		: className;

	const selectElement = (
		<select
			ref={selectRef}
			className={selectElmClass}
			{...selectProps}
			onFocus={(e) => {
				props.onFocus?.(e);
				setFocused(true);
			}}
			onBlur={(e) => {
				props.onBlur?.(e);
				setFocused(false);
			}}
			value={value != null ? currVal : undefined}
			style={isBrowser && hiddenSelectStyles}
			data-fancy={isBrowser && ''}
			// data-value={value} // idea?
			onChange={(e) => {
				const idx = e.currentTarget.selectedIndex - (placeholder != null ? 1 : 0);
				setCurrVal(optionsNorm[idx].value);
				onChange && onChange(e);
				if (onSelected) {
					onSelected(optionsNorm[idx].value, options[idx]);
				}
			}}
		>
			{placeholder != null && (
				<option value="" disabled={props.placeholderDisabled}>
					{placeholder}
				</option>
			)}

			{optionsNorm.map((opt, i) => (
				<option
					key={i}
					value={opt.value != null ? opt.value : ''}
					disabled={opt.disabled}
				>
					{getOptionLabel(opt).trimRight()}
				</option>
			))}
		</select>
	);

	if (isBrowser) {
		return (
			<span
				className={
					getBemClass(bem, modifier, className) +
					getModifierClass(bem, [focused && 'focused', props.disabled && 'disabled'])
				}
				style={{ position: 'relative' }}
			>
				<span
					className={getBemClass(bem + '__value', !currVal && currVal !== 0 && 'empty')}
				>
					{selectedOptionText}
				</span>
				{selectElement}
			</span>
		);
	}
	return selectElement;
};

export default Selectbox;
