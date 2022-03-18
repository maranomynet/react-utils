/** @jsx createElement */
import {
	createElement,
	useState,
	useMemo,
	CSSProperties,
	ReactNode,
	ReactElement,
	useRef,
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
	placeholder?: string;
	onSelected?: (value?: V, option?: O) => void;
	ssr?: boolean | 'ssr-only';
	visibleFormat?: (selected: O) => NonNullable<ReactNode>;
} & BemProps &
	Omit<
		JSX.IntrinsicElements['select'],
		'value' | 'defaultValue' | 'multiple' | 'className'
	>;
/** /
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

const Selectbox = <O extends OptionOrValue>(props: SelectboxProps<O>): ReactElement => {
	const [focused, setFocused] = useState(false);

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
		...selectProps
	} = props;

	const isBrowser = useIsBrowserSide(ssr);

	const [currVal, setCurrVal] = useState(() =>
		value != null ? value : defaultValue != null ? String(defaultValue) : undefined
	);

	type V = O extends SelectboxOption ? O['value'] : O;
	const optionsNorm = useMemo(
		() =>
			options.map((item) =>
				typeof item === 'string' || typeof item === 'number' ? { value: item } : item
			),
		[options]
	) as SelectboxOptions<V>; // Feck!

	// TODO: DECIDE: Handle value="" and options array that doesn't include that value. What to do???
	// Should we auto-generate option and push it to the bottom of the list?

	const selectedOptionText = useMemo(
		() => isBrowser && getVisibleLabel(options, currVal, placeholder, visibleFormat),
		[isBrowser, currVal, options, placeholder, visibleFormat]
	);

	const selectElmClass = isBrowser
		? undefined
		: bem
		? getBemClass(bem, modifier, className)
		: className;

	const selectElement = (
		<select
			className={selectElmClass}
			{...selectProps}
			value={value}
			style={isBrowser && hiddenSelectStyles}
			data-fancy={isBrowser && ''}
			// data-value={value} // idea?
			onChange={(e) => {
				const idx = e.currentTarget.selectedIndex - (placeholder != null ? 1 : 0);
				setCurrVal(optionsNorm[idx].value);
				onChange && onChange(e);
				if (onSelected) {
					optionsNorm[idx]
						? onSelected(optionsNorm[idx].value, options[idx])
						: onSelected();
				}
			}}
		>
			{placeholder != null && <option value="">{placeholder || ''}</option>}

			{optionsNorm.map((opt, i) => (
				<option key={i} value={opt.value != null ? opt.value : ''}>
					{getOptionLabel(opt)}
				</option>
			))}
		</select>
	);

	if (isBrowser) {
		const emptyValueClass = !value && value !== 0 ? ' ' + bem + '__value--empty' : '';

		return (
			<span
				className={
					getBemClass(bem, modifier, className) +
					getModifierClass(bem, [focused && 'focused', props.disabled && 'disabled'])
				}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				style={{ position: 'relative' }}
			>
				<span className={bem + '__value' + emptyValueClass}>{selectedOptionText}</span>
				{selectElement}
			</span>
		);
	}
	return selectElement;
};

export default Selectbox;
