function LevelOption (props) {
    const onChange = (element) => props.levelControl(element);
    const label = props.level[0].toUpperCase() + props.level.slice(1);

    return (
        <div className="input">
            <input type="radio" name="level"
            id={props.level}
            value={props.level}
            checked={props.checked}
            onChange={onChange}/>
            <label htmlFor={props.level}> {label}</label>
        </div>
    );
}

export default function Menu (props) {
    const levelControl = (element) => props.levelControl(element);
    const levels = ['easy', 'intermediate', 'hard'];

    const radios = levels.map((level, index) =>
        <LevelOption key={'op-' + index.toString()}
        level={level}
        checked={props.level === level}
        levelControl={levelControl}/>
    );

    return (
        <div className="level game">
            {radios}
        </div>
    );
}