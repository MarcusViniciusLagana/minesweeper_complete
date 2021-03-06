import React from 'react';
import ReactDOM from 'react-dom';
import { instanceOf } from 'prop-types';
import { CookiesProvider, withCookies, Cookies } from 'react-cookie';
import Board from './board';
import GameInfo from './gameinfo';
import Menu from './menu';
import OverScreen from './overscreen';
import * as screens from './screens.json';
import './index.css';

class Game extends React.Component {

    static timerID = null;
    static updates = {indexes: [], values: []};

    static propTypes = { cookies: instanceOf(Cookies).isRequired };

    constructor (props) {
        super (props);
        const {rowsNumber, columnsNumber, minesNumber, time, holdTime} = props;
        const { cookies } = this.props;

        // setting initial state
        this.state = {
            gameID: cookies.get('gameID') || null,
            rowsNumber,
            columnsNumber,
            minesNumber,
            squaresValues: Array(rowsNumber * columnsNumber).fill(''),
            squaresCSS: Array(rowsNumber * columnsNumber).fill(''),
            initialTime: time,
            time,
            holdTime,
            phase: 'paused',
            level: 'easy',
            msg: '',
        };
    }

    // when mounting, set timer to null
    async componentDidMount () {
        const {gameID, rowsNumber, columnsNumber, minesNumber} = this.state;
        let response = {gameID};

        response = await request({gameID, rowsNumber, columnsNumber, minesNumber}, 'POST', '/Init');
        if (gameID !== response.gameID) {
            const { cookies } = this.props;
            cookies.remove();
            const { gameID } = response;
            cookies.set('gameID', gameID);
            this.setState({ gameID });
        }
    }

    // when unmouting, reset timer
    componentWillUnmount () { if (Game.timerID) clearInterval(Game.timerID); }

    async restartGame (rowsNumber = null, columnsNumber = null, minesNumber = null) {
        if (!minesNumber) minesNumber = this.state.minesNumber;
        if (!rowsNumber) rowsNumber = this.state.rowsNumber;
        if (!columnsNumber) columnsNumber = this.state.columnsNumber;
        
        await request({gameID: this.state.gameID, rowsNumber, columnsNumber, minesNumber}, 'PUT', '/Restart');
        
        // resseting timer
        const time = this.state.initialTime;
        if (Game.timerID) clearInterval(Game.timerID);
        Game.timerID = null;

        // Reseting updates
        Game.updates = {indexes: [], values: []};

        // reseting state
        this.setState({
            rowsNumber,
            columnsNumber,
            minesNumber,
            squaresValues: Array(rowsNumber * columnsNumber).fill(''),
            squaresCSS: Array(rowsNumber * columnsNumber).fill(''),
            time,
            phase: 'paused',
            msg: ''
        });
    }

    async clickHandle (button, index) {
        const cssClasses = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
        let squaresValues = this.state.squaresValues.slice();
        let squaresCSS = this.state.squaresCSS.slice();
        const gameID = this.state.gameID;
        const minesNumber = this.state.minesNumber;
        let phase = this.state.phase;
        let msg = '';

        if (phase === 'game-over' || !this.state.time || !button) return;

        // If it is the first click, initializes clock
        if (phase === 'paused') {
            phase = 'playing'
            if (!Game.timerID) Game.timerID = setInterval(async () => {
                let time = this.state.time;
                time--;
                this.setState({ time });
                // if time is up: game over
                if (time <= 0) {
                    this.setState({ phase: 'game-over', msg: 'Time is Over!' });
                    clearInterval(Game.timerID);
                    await request({gameID, level: this.state.level, win: false}, 'PUT', '/EndGame');
                }
            },1000);
        }

        // if clicked with left button
        if (button === 'left') {
            
            // if square was already clicked or is saved, then return.
            if (squaresCSS[index]) return;

            const data = await request({gameID, index, updates: Game.updates }, 'PUT', '/OpenSquare');
            if (data.status === 'failed') return;
            squaresValues = this.state.squaresValues.slice();
            squaresCSS = this.state.squaresCSS.slice();
            phase = this.state.phase;
            Game.updates = {indexes: [], values: []};
            for (let i = 0; i < data.updates.indexes.length; i++) {
                squaresValues[data.updates.indexes[i]] = data.updates.values[i] ? data.updates.values[i] : '';
                if (typeof(data.updates.values[i]) === 'number')
                    squaresCSS[data.updates.indexes[i]] = 'clicked ' + cssClasses[data.updates.values[i]];
                else if (data.updates.values[i] === '\u2713')
                    squaresCSS[data.updates.indexes[i]] = 'saved-true';
                else if (data.updates.values[i] === '\u2717')
                    squaresCSS[data.updates.indexes[i]] = 'exploded';
                else
                    squaresCSS[data.updates.indexes[i]] = 'clicked exploded';
            }

            // if square is a bomb, game-over
            if (squaresCSS[index] === 'clicked exploded') {
                squaresCSS[index] = 'clicked'
                phase = 'game-over';
                msg = 'Exploded!!!';
                clearInterval(Game.timerID);
                await request({gameID, level: this.state.level, win: false}, 'PUT', '/EndGame');
            // if square is not a bombSymbol, count bombs around the square
            // Update value with the number of bombs and squaresCSS with
            // 'clicked ' + the number of bombs as text
            // positions keep the indexes of the squares around
            }
        // if clicked with right button
        } else if (button === 'right') {
            // if the button is clicked, return
            if (squaresCSS[index].includes('clicked')) return;

            // Cycle through the symbols '' (nothing), '\u2691' (saved) and
            // '?' (maybe) with each click
            squaresValues[index] = squaresValues[index] === '' ? '\u2691' :
                squaresValues[index] === '\u2691' ? '?' : '';
            // set the corresponding squaresCSS if the 'saved' symbol is used
            if (squaresValues[index] === '\u2691') squaresCSS[index] = 'saved';
            else squaresCSS[index] = '';
            if (Game.updates.indexes.includes(index))
                Game.updates.values[Game.updates.indexes.indexOf(index)] = squaresValues[index];
            else {
                Game.updates.indexes.push(index)
                Game.updates.values.push(squaresValues[index]);
            }
        }

        // Check if only the bombSymbol squares are not clicked, if yes -> Victory!
        if (phase !=='game-over' && minesNumber === squaresCSS.filter(x => x.indexOf('clicked') === -1).length) {
            phase = 'game-over';
            msg = 'Victory!';
            clearInterval(Game.timerID);
            await request({gameID, level: this.state.level, win: true}, 'PUT', '/EndGame');
            for (let i = 0; i < squaresCSS.length; i++) {
                if (!squaresCSS[i].includes('clicked')) {
                    squaresValues[i] = '\u2713';
                    squaresCSS[i] = 'saved-true';
                }
            }
        }

        // save the current state
        await this.setState({ squaresValues, squaresCSS, phase, msg });
    }

    levelControl (element) {
        const level = element.currentTarget.value;
        let rows = 13; // level Hard
        let columns = 18; // level Hard
        let minesNumber = 40; // level Hard 17%

        if (level === 'easy') {
            rows = 9;
            columns = 9;
            minesNumber = 10; // 12%
        }
        if (level === 'intermediate') {
            rows = 12;
            columns = 12;
            minesNumber = 22; // 15%
        }

        document.documentElement.style.setProperty('--width', columns*40+'px');
        document.documentElement.style.setProperty('--height', rows*40+'px');
        this.setState({ level });
        this.restartGame(rows, columns, minesNumber);
    }

    render () {
        const minesNumber = this.state.minesNumber;
        const squaresCSS = this.state.squaresCSS;
        // Count the number of mines already discovered (saved)
        const bombsNumber = minesNumber - squaresCSS.filter(x => x === 'saved').length
            - squaresCSS.filter(x => x === 'saved-true').length;

        let popup = null;
        if (this.state.msg === 'Victory!') popup =
            <OverScreen autoFadeOut={true} time={1} content={screens.victory}/>
        if (this.state.msg === 'Time is Over!') popup =
            <OverScreen autoFadeOut={true} time={1} content={screens.time}/>
        if (this.state.msg === 'Exploded!!!') popup =
            <OverScreen autoFadeOut={true} time={3} content={screens.explode}/>
        
        return (<>
            <OverScreen autoFadeOut={false} time={5} content={screens.initial}/>
            {popup}
            <div className="title">Minesweeper</div>
            <div className="container">
                <div className="game-area">
                    <GameInfo bombsNumber={bombsNumber} time={this.state.time}
                        msg={this.state.msg}/>
                    <div className="game">
                        <Board squaresValues={this.state.squaresValues}
                            squaresCSS={this.state.squaresCSS}
                            rowsNumber={this.state.rowsNumber}
                            columnsNumber={this.state.columnsNumber}
                            holdTime={this.state.holdTime}
                            clickHandle={(button, i) => this.clickHandle(button, i)}/>
                    </div>
                    <Menu level={this.state.level}
                        levelControl={(element) => this.levelControl(element)}/>
                    <div className="restart">
                        <button className="restart-button"
                            onClick={() => this.restartGame()}>
                            Restart Game
                        </button>
                    </div>
                </div>
            </div>
        </>);
    }
}

async function request (body, method, endpoint) {
    const requestOptions = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
    const response = await fetch(`/api${endpoint}`, requestOptions);
    const data = await response.json();
    console.log(data.msg);
    return data;
}

const GameApp = withCookies(Game)

ReactDOM.render(
    <CookiesProvider>
        <GameApp rowsNumber={9} columnsNumber={9} minesNumber={10} time={120} holdTime={0.3}/>
    </CookiesProvider>,
    document.getElementById('root')
);