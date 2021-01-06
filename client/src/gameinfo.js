export default function GameInfo (props) {
    return (
        <div className="game-info game">
            <div className="bombs-time">
                <p>{Zerofill(props.bombsNumber,3)}</p>
            </div>
            <div className="game-over">
                <p>{props.msg}</p>
            </div>
            <div className="bombs-time">
                <p>{Zerofill(props.time,3)}</p>
            </div>
        </div>
    );
}

function Zerofill (number,width) {
    let sign = '';

    if (number < 0) {
        number *= -1;
        sign = '-';
    }

    width -= number.toString().length - 1;
    if ( width > 0 )
        return sign + new Array(width).join('0') + number;
    
    // Always return a string
    return sign + number + "";
}