import React from 'react';

function Image (props) {
    const img = props.img;
    return (
        <img className={props.initialState ? img.activeCSS : img.deactiveCSS} alt={img.alt} src={img.src}/>
    );
}

function Button (props) {
    const btn = props.btn;
    return (
        <button className={props.initialState ? btn.activeCSS : btn.deactiveCSS} onClick={props.clickHandle}>
            {btn.text}
        </button>
    );
}

function FirstLine (props) { return (<>{props.txt}</>); }

function Line (props) { return (<><br/><br/>{props.txt}</>); }

function Text (props) {
    const text = props.txt;
    const content = [];

    content.push(<FirstLine key={props.index + '-Line-0'}
        txt={text.content[0]}/>);

    for (let idx = 1; idx < text.content.length; idx++) {
        const line = text.content[idx];
        const key = props.index + '-Line-' + idx.toString();
        content.push(<Line key={key} txt={line}/>);
    }

    return (<>{content}</>);
}

function Division (props) {
    const div = props.div;
 
    const content = renderDIV(div.content, props.initialState, props.clickHandle, props.index);

    return (
        <div className={props.initialState ? div.activeCSS : div.deactiveCSS}>
            {content}
        </div>
    );
}

export default class OverScreen extends React.Component {

    static invisibleTimer = null;
    static fadeOutTimer = null;

    constructor (props) {
        super(props);
        this.state = {
            initialState: true,
            isVisible: true,
            autoFadeOut: props.autoFadeOut,
            time: props.time * 1000,
            content: props.content,
        }
    }

    // when mounting, set timer to null
    componentDidMount () {
        OverScreen.invisibleTimer = null;
        OverScreen.fadeOutTimer = null;
    }

    // when unmouting, reset timer
    componentWillUnmount () {
        if (OverScreen.invisibleTimer) clearInterval(OverScreen.invisibleTimer);
        if (OverScreen.fadeOutTimer) clearInterval(OverScreen.fadeOutTimer);
    }

    turnInvisible () {
        this.setState({ isVisible: false });
    }

    fadeOut () {
        this.setState({ initialState: false, autoFadeOut: false});
        if (!OverScreen.invisibleTimer)
            OverScreen.invisibleTimer = setTimeout(() => this.turnInvisible(), this.state.time);
        else this.turnInvisible();
    }

    render () {

        if (!this.state.isVisible) return null;

        const div = this.state.content.slice();
        const clickHandle = () => this.fadeOut();
        const initialState = this.state.initialState;

        const content = renderDIV(div, initialState, clickHandle);

        if (this.state.autoFadeOut && !OverScreen.fadeOutTimer)
            OverScreen.fadeOutTimer = setTimeout(() => this.fadeOut(), this.state.time);

        return (<> {content} </>);
    }
}

function renderDIV (div, initialState, clickHandle, parentKey='init') {
    let content = [];

    for (let idx = 0; idx < div.length; idx++) {
        const item = div[idx];
        const key = parentKey + '-' + item.type + '-' + idx.toString();
        if (item.type === 'text') content.push(<Text key={key} index={key} txt={item}/>);
        if (item.type === 'img') content.push(<Image key={key} initialState={initialState} img={item}/>);
        if (item.type === 'btn') content.push(<Button key={key} initialState={initialState} btn={item} clickHandle={clickHandle}/>);
        if (item.type === 'div') content.push(<Division key={key} index={key} initialState={initialState} div={item} clickHandle={clickHandle}/>);
    }

    return content;
}