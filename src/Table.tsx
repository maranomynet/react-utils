import React, { FC, memo, ReactNode, useMemo } from 'react';

type CellMeta = { className?: string } & (
	| { tel?: false; number?: false; text?: false }
	| { number: true; tel?: false; text?: false }
	| { tel: true; number?: false; text?: false }
	| { text: true | 'right' | 'center'; number?: false; tel?: false });

type CellData = {
	value: ReactNode | ((rowIdx: number) => ReactNode);
	colSpan?: number;
} & CellMeta;

interface RowData {
	cells: Array<CellData>;
}

export type TableCols = Array<CellMeta | null>;
export type TableCell = string | CellData;
export type TableRow = Array<TableCell> | { cells: Array<TableCell> };
export type TableData = {
	caption?: ReactNode;
	thead: Array<TableRow>;
	tfoot?: Array<TableRow>;
} & (
	| {
			tbody: Array<TableRow>;
			tbodies?: undefined;
	  }
	| {
			tbodies: Array<Array<TableRow>>;
			tbody?: undefined;
	  });

interface CellProps {
	data: CellData;
	rowIdx: number;
	meta?: CellMeta | null;
	th?: boolean;
	rowScope?: boolean;
}

const TableCell: FC<CellProps> = ({ data, meta, th, rowScope, rowIdx }) => {
	const Tag = th ? 'th' : 'td';
	const { className = '', value, colSpan, number, tel, text } = { ...data, ...meta };

	const numberClass = !number
		? ''
		: number === true
		? 'Cell--number'
		: 'Cell--number--' + number;
	const textClass = !text ? '' : text === true ? 'Cell--text' : 'Cell--text--' + text;
	const telClass = tel ? 'Cell--tel' : '';

	let _className = numberClass || telClass || textClass;
	_className += (_className && className ? ' ' : '') && className;

	return (
		<Tag
			className={_className || undefined}
			colSpan={colSpan}
			scope={rowScope ? 'row' : undefined}
		>
			{typeof value === 'function' ? value(rowIdx) : value}
		</Tag>
	);
};
interface SectionProps {
	section?: Array<RowData>;
	cols?: TableCols;
	Tag: 'thead' | 'tfoot' | 'tbody';
}
const TableSection: FC<SectionProps> = ({ section, cols = [], Tag }) =>
	section ? (
		<Tag>
			{section.map((row, rowIdx) => {
				let colIdx = 0;
				return (
					<tr key={rowIdx}>
						{row.cells.map((cell, i) => {
							const meta = cols[colIdx];
							const rowScope = i === 0;
							const th = Tag === 'thead' || rowScope;
							colIdx += cell.colSpan || 1;
							return (
								<TableCell
									key={i}
									th={th}
									data={cell}
									meta={meta}
									rowIdx={rowIdx}
									rowScope={rowScope}
								/>
							);
						})}
					</tr>
				);
			})}
		</Tag>
	) : null;

const normalizeTableSectData = (
	rows: Array<Array<TableCell> | { cells: Array<TableCell> }>
): Array<{ cells: Array<CellData> }> =>
	rows.map((row) => {
		const cells = 'cells' in row ? row.cells : row;
		return {
			cells: cells.map(
				(data): CellData => (typeof data === 'string' ? { value: data } : data)
			),
		};
	});

interface TableDataNormalized {
	caption?: ReactNode;
	thead: Array<RowData>;
	tfoot?: Array<RowData>;
	tbodies: Array<Array<RowData>>;
}

const normalizeTableData = (tableData: TableData): TableDataNormalized => {
	const { caption, thead, tfoot, tbody, tbodies } = tableData;
	return {
		caption,
		thead: normalizeTableSectData(thead),
		tfoot: tfoot && normalizeTableSectData(tfoot),
		tbodies: (tbodies || (tbody ? [tbody] : [])).map(normalizeTableSectData),
	};
};

export type TableProps = {
	cols?: TableCols;
} & TableData;

type P = {
	className: string;
	children?: undefined;
} & TableProps;

const Table: FC<P> = memo(
	({ className, caption, thead, tfoot, tbody, tbodies, cols }) => {
		const data = useMemo(
			() => normalizeTableData({ caption, thead, tfoot, tbody, tbodies } as TableData),
			[caption, thead, tfoot, tbody, tbodies]
		);
		return (
			<table className={className}>
				{data.caption && <caption>{data.caption}</caption>}
				<TableSection section={data.thead} cols={cols} Tag="thead" />
				<TableSection section={data.tfoot} cols={cols} Tag="tfoot" />
				{data.tbodies.map((section, i) => (
					<TableSection key={i} section={section} cols={cols} Tag="tbody" />
				))}
			</table>
		);
	}
);

export default Table;
