import ClickNHold from 'react-click-n-hold';

function Square (props) {
    const cssClass = props.squareCSS + ' square';
    let value = props.squareValue;
    const clickHandle = (e, enought) => {
        if (!enought) {
            if (e.button === 0) props.clickHandle('left');
            else if (e.button === 2) props.clickHandle('right');
        }
    }
    const rightClick = () => props.clickHandle('right');

    return (
        <ClickNHold time={props.holdTime} onClickNHold={rightClick} onEnd={clickHandle}>
            <button className={cssClass} onContextMenu={(e) => e.preventDefault()}>
                {value}
            </button>
        </ClickNHold>
    );
}

function BoardRow (props) {

    const columns = props.squaresValues.map((squareValue, column) =>
        <Square key={'square-' + props.row.toString() + '-' + column.toString()}
            holdTime={props.holdTime}
            squareValue={squareValue}
            squareCSS={props.squaresCSS[column]}
            clickHandle={(button) => props.clickHandle(button, column)}/>
    );

    return(
        <div className="board-row">
            {columns}
        </div>
    );
}

export default function Board (props) {
    const rowsNumber = props.rowsNumber;
    const columnsNumber = props.columnsNumber;

    const rows = Array(rowsNumber);

    for (let row = 0; row < rowsNumber; row++) {
        const initIndex = row * columnsNumber;
        const endIndex = initIndex + columnsNumber;
        const squaresValues = props.squaresValues.slice(initIndex, endIndex);
        const squaresCSS = props.squaresCSS.slice(initIndex, endIndex);
        rows[row] = <BoardRow key={'row-' + row.toString()}
            row={row}
            holdTime={props.holdTime}
            squaresValues={squaresValues}
            squaresCSS={squaresCSS}
            clickHandle={(button, column) => props.clickHandle(button, initIndex + column)}/>
    }

    return (
        <div className="game-board">
            {rows}
        </div>
    );
}