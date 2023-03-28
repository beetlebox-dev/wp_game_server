import { click } from '@testing-library/user-event/dist/click';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';






// Are things rendering twice on initial load/mount?





/*
cd /Users/john/Desktop/Apps/GoogleCLI/beetleboxdev/sources/wp-game-server/frontend
npm start
http://localhost:3000
For production: npm run build
*/


// New games generate at 5:59am UTC (9:59pm Pacific previous day, 2:59pm Japan day of) (add 1 hour during daylight savings).


// game_graph[node_index] = [correct_pointers_object, decoy_pointers_object, words_str_list, pos_str, gloss_str]
// x_pointers_object = {node_index: pointer, ... }
// pointer = [pointer_symbol, source_word, target_word]


// Transition animation of next synset area.
const minTransSecs = 1;  // The total seconds to transition min-height property from current to 0vh.
const minMaxTransRatio = 4;  // maxTransSecs / minTransSecs  // Attempts to make shrink and grow timing to be the similar, assuming that average height of next synset text areas is 0.2vh.
const maxTransSecs = minTransSecs * minMaxTransRatio;  // The total seconds to transition max-height property from current to 1vh.
const transTimingFunc = 'cubic-bezier(0.6, 0, 1, 1)';


const stripeAreaLength = 5;  // An integer. Each unit represents 1 stripe region with alternating colors on top/bottom.


// Global variables.
let nodeOrder, gameGraph, startSynsetId, targetSynsetId, totalStrikes;


// Main React Component

class Game extends React.Component {

    constructor(props) {

        super(props);

        this.state = {status: 'load'};

        fetch(process.env.REACT_APP_GAME_DATA_URL)
        .then((response) => response.json())
        .then((data) => {
            gameGraph = data[0];
            startSynsetId = data[1];
            targetSynsetId = data[2];
            totalStrikes = data[3];
            this.resetGame();
        });
    };

    resetGame() {

        nodeOrder = Array(gameGraph.length).fill(0);

        this.setState({
            status: 'start',
            strikeCount: 0,
            stepCount: 1,
            prevSynsets: [],
            currentSynsetConnectWord: -1,
            currentSynsetId: startSynsetId, 
            nextSynsets: {a: null, b: null},  // {a: [0/1 means correct/decoy, nodeIndex], b: [ ... ] }
            targetWords: wordsStrFromArray(gameGraph[targetSynsetId][2]),
        });

        this.choose();
    };

    playGame() {
        this.setState({status: 'play'});
    };

    choose(clickedAorB=null) {  // To init at game start, run choose(null).

        this.setState((prevState) => {

            if (prevState.status !== 'play' && prevState.status !== 'start') return {};  // No state change.

            const stateChangeObj = {};
            const addToprevSynsets = [];
            let pointerRoot;

            if (clickedAorB !== null) {

                const nextSynsetData = prevState.nextSynsets[clickedAorB];

                // Update stepCount and currentSynsetId.
                const updatedCurrentSynsetId = nextSynsetData.id;
                stateChangeObj['currentSynsetId'] = updatedCurrentSynsetId;
                stateChangeObj['stepCount'] = prevState.stepCount + 1;
                stateChangeObj['currentSynsetConnectWord'] = nextSynsetData.connectWords[1];
                const wordsFromCurrToPrev = pruneDisplayWords(prevState, clickedAorB);
                const pointerPhraseFromCurrToPrev = prevState.nextSynsets[clickedAorB].phrase;
                const prevSynsetObj = {words: wordsFromCurrToPrev, pointer: pointerPhraseFromCurrToPrev};
                addToprevSynsets.push(prevSynsetObj);

                if (nextSynsetData.group === 1) {

                    // Add strike.
                    const updatedStrikeCount = prevState.strikeCount + 1;
                    stateChangeObj['strikeCount'] = updatedStrikeCount;

                    if (updatedStrikeCount >= totalStrikes) {
                        stateChangeObj['status'] = 'lose';
                        const wordsFromClickedToPrev = getFinalWordsToDisplayLose(prevState, clickedAorB);
                        const finalPrevSynsetObj = {words: wordsFromClickedToPrev, pointer: null};
                        stateChangeObj['prevSynsets'] = prevState.prevSynsets.concat(addToprevSynsets, [finalPrevSynsetObj]);
                        return stateChangeObj;  // Skip updating nextSynsets.
                    };
                };

                pointerRoot = updatedCurrentSynsetId;
                nodeOrder[pointerRoot] = prevState.stepCount + 1;

            } else {
                // clickedAorB === null
                pointerRoot = prevState.currentSynsetId;
                nodeOrder[pointerRoot] = 1;
            };

            const updatedPointersObj = getUpdatedPointersObj(pointerRoot);

            if (updatedPointersObj.result === 'cont') {
                stateChangeObj['nextSynsets'] = updatedPointersObj.data;

            } else {

                stateChangeObj['status'] = updatedPointersObj.result;

                if (updatedPointersObj.result === 'win') {

                    const finalPrevSynsetObj = {
                        words: getFinalWordsToDisplayWin(prevState, clickedAorB, updatedPointersObj.data.connectWords[0]), 
                        pointer: updatedPointersObj.data.phrase,
                    };
                    addToprevSynsets.push(finalPrevSynsetObj);

                    const allTargetWords = gameGraph[targetSynsetId][2];
                    const displayTargetWordIndex = Math.max(updatedPointersObj.data.connectWords[1], 0);  // Change -1 (any word) to 0 (first word).
                    stateChangeObj['targetWords'] = allTargetWords[displayTargetWordIndex];
                    
                } else {  // updatedPointersObj.result === 'lose'

                    const wordsFromClickedToPrev = getFinalWordsToDisplayLose(prevState, clickedAorB);
                    const finalPrevSynsetObj = {words: wordsFromClickedToPrev, pointer: null};
                    addToprevSynsets.push(finalPrevSynsetObj);
                };
            };

            stateChangeObj['prevSynsets'] = prevState.prevSynsets.concat(addToprevSynsets);
            return stateChangeObj;
        });
    };

    render() {

        if (this.state.status === 'load') return;

        if (['win', 'lose'].includes(this.state.status)) {
            document.body.classList.add(this.state.status);
        };

        return (<>
            <StatusBar
                status={this.state.status}
                currentStrikeCount={this.state.strikeCount}
                totalStrikeCount={totalStrikes}
                currentStepCount={this.state.stepCount}
            />

            <WinLoseHeading
                status={this.state.status}
                stepCount={this.state.stepCount}
            />

            <PreviousSynsets
                synsets={this.state.prevSynsets}
            />

            <CurrentSynset
                status={this.state.status}
                words={pruneDisplayWords(this.state)}
                id={this.state.currentSynsetId}
            />

            <ResetButton
                displayStatus='start'
                text='BEGIN'
                status={this.state.status}
                handleClick={this.playGame.bind(this)}
            />

            <ResetButton
                displayStatus='lose'
                text='RESET'
                status={this.state.status}
                handleClick={this.resetGame.bind(this)}
            />

            <NextSynsetArea
                state={this.state}
                choose={this.choose.bind(this)}
            />

            <Target
                status={this.state.status}
                targetWords={this.state.targetWords}
            />

            <ResetButton
                displayStatus='win'
                text='RESET'
                status={this.state.status}
                handleClick={this.resetGame.bind(this)}
            />
        </>)
    };
};


// Secondary React Components

function StatusBar(props) {
    if (props.status !== 'load' && props.status !== 'start') {
        return (
            <div id="stats-bar">
                <StrikeArea
                    currentStrikeCount={props.currentStrikeCount}
                    totalStrikeCount={props.totalStrikeCount}
                />
                <ArrowArea
                    currentStepCount={props.currentStepCount}
                />
            </div>
        );
    };
    // Else, no html.
};

function StrikeArea(props) {

    const strikeNums = Array.from(Array(props.totalStrikeCount).keys());  // strikeNums = [0, 1, ... , totalStrikeCount - 1]
    return (
        <div id="strike-area">
            { strikeNums.map(strikeNum => renderStrikeBox(strikeNum)) }
        </div>
    );

    function renderStrikeBox(strikeNum) {
        let strikeBoxContent = null;
        if (strikeNum < props.currentStrikeCount) {
            strikeBoxContent = <img src={process.env.PUBLIC_URL + "/red_x.png"}/>;
        };
        return (
            <div key={strikeNum} className="strike-box">{strikeBoxContent}</div>
        );
    };
};

function ArrowArea(props) {

    const stepNums = Array.from(Array(props.currentStepCount).keys());  // stepNums = [0, 1, ... , currentStepCount - 1]
    return (
        <div id="arrow-area">
            { stepNums.map(stepNum => renderArrowImg(stepNum)) }
        </div>
    );

    function renderArrowImg(stepNum) {
        return (
            <img key={stepNum} src={process.env.PUBLIC_URL + "/arrow_outline.png"}/>
        )
    };
};

function WinLoseHeading(props) {
    if (props.status === 'lose') {
        return (
            <h1 id='lose-heading'>LOSE</h1>
        );
    } else if (props.status === 'win') {
        const winStats = `in ${props.stepCount} steps`;
        return (
            <h1 id='win-heading'
                >WIN
                <span id='win-stats'>{winStats}</span>
            </h1>
        );
    };
    // Else, no html.
};

function PreviousSynsets(props) {

    return (
        <div id="prev-synsets">
            { props.synsets.map((synsetInfo, index) => renderPrevSynset(synsetInfo, index)) }
        </div>
    );

    function renderPrevSynset(synsetInfo, index) {
        return (
            <div key={index}>
                <span className="words">{synsetInfo.words}</span>
                <br/>
                <span className="pointer">{synsetInfo.pointer}</span>
            </div>
        );
    };
};

function CurrentSynset(props) {

    if (props.status === 'play' || props.status === 'start') {

        let heading = null;
        let pos = '';
        let gloss = '';
        if (props.status === 'start') {
            heading = <><span className="endpoint-heading">START</span><br/></>;
            pos = gameGraph[props.id][3];
            gloss = gameGraph[props.id][4];    
        };

        return (
            <div id="curr-synset">
                {heading}
                <span className="words">{props.words} </span><span className="pos">{pos}</span>
                <br/>
                <span className="gloss">{gloss}</span>
            </div>
        );
    };
};

function NextSynsetArea(props) {

    if (props.state.status === 'play') {

        const stripeNums = Array.from(Array(stripeAreaLength).keys());  // stripeNums = [0, 1, ... , stripeAreaLength - 1]

        return (
            <div id='next-synset-col'>
                <div id="next-synset-area">
                    <div id="next-syn-a-gutter"></div>
                    <div id="next-synsets">
                        <NextSynset
                            id={'b'}
                            choose={props.choose}
                            gameState={props.state}
                        />
                        <NextSynset
                            id={'a'}
                            choose={props.choose}
                            gameState={props.state}
                        />
                    </div>
                    <div id="next-syn-b-gutter"></div>
                </div>
                <div id='future-choice-area'>
                    { stripeNums.map(stripeNum => renderSingleStripe(stripeNum)) }
                </div>
            </div>
        );
    };
    // Else, no html.

    function renderSingleStripe(stripeNum) {
        let letter = 'b';
        if (stripeNum % 2 === 0) letter = 'a';  // Even stripe numbers are 'a'; odds are 'b'.
        return <div className={letter} key={stripeNum}></div>;
    };
};

class NextSynset extends React.Component {

    constructor(props) {
        super(props);
        this.state = {mounted: false};
    };

    componentDidMount() {
        this.setState({mounted: true});
    };

    componentDidUpdate(prevProps) {
        nextSynUnrestrictHeightAfterRender(this.props.id);
    };

    render() {

        if (this.props.gameState.status !== 'play' || this.props.gameState.nextSynsets.a === null) return;

        if (this.state.mounted) nextSynRestrictHeightBeforeRender(this.props.id);

        const pointerData = this.props.gameState.nextSynsets[this.props.id];
        const synsetData = gameGraph[pointerData.id];
        const wordsStr = wordsStrFromArray(synsetData[2], [pointerData.connectWords[1]]);

        return (
            <div id={`next-syn-${this.props.id}-text`} onClick={() => this.props.choose(this.props.id)}>
                <span className="pointer">{pointerData.phrase}</span>
                <span>
                    <span className="words">{wordsStr} </span>
                    <span className="pos">{synsetData[3]}</span>
                </span>
                <span className="gloss">{synsetData[4]}</span>
            </div>
        );
    };
};

function Target(props) {

    let targetMargin = null;
    if (props.status === 'play' || props.status === 'lose') {
        targetMargin = <div id="target-margin"></div>
    };

    let targetHeading = null;
    if (props.status !== 'win') {
        targetHeading = <><span className="endpoint-heading">TARGET</span><br/></>;
    };

    return (
        <>
            {targetMargin}
            <div id="target">
                {targetHeading}
                <span className="words">{props.targetWords} </span>
                <span className="pos">{gameGraph[targetSynsetId][3]}</span>
                <br/>
                <span className="gloss">{gameGraph[targetSynsetId][4]}</span>
            </div>
        </>
    );
};

function ResetButton(props) {
    if (props.displayStatus === props.status) {
        return <button className='reset-button' onClick={props.handleClick}>{props.text}</button>;
    };
    // Else, no html.
};


// Animation and Appearance

function nextSynRestrictHeightBeforeRender(aOrB) {
    const elemId = `next-syn-${aOrB}-text`;
    const elem = document.getElementById(elemId);
    const elemLiveStyles = window.getComputedStyle(elem);
    elem.style.minHeight = elem.style.maxHeight = elemLiveStyles.getPropertyValue('height');  // Set max/min heights to current height.
    elem.style.transition = 'all 0s';  // Transition to restricted max/min height value instantly.
};

function nextSynUnrestrictHeightAfterRender(aOrB) {
    setTimeout(() => {  // Need setTimeout here to prevent subsequent calls from abruptly ending transitions from previous calls.
        const elemId = `next-syn-${aOrB}-text`;
        const elem = document.getElementById(elemId);
        elem.style.transition = `min-height ${minTransSecs}s ${transTimingFunc}, max-height ${maxTransSecs}s ${transTimingFunc}`;  // Set transition properties.
        // Gradually loosen height restrictions of element to values below.
        elem.style.minHeight = '0vh';
        elem.style.maxHeight = '100vh';
    }, 0);
};


// Game Data Manipulation

function getFinalWordsToDisplayLose(state, clickedAorB) {
    const clickedSynsetData = state.nextSynsets[clickedAorB];
    const allWordsArray = gameGraph[clickedSynsetData.id][2];
    const displayWordIndex = Math.max(clickedSynsetData.connectWords[1], 0);  // Turns -1 (no specific pointer word) to 0 (first pointer word index).
    return allWordsArray[displayWordIndex];
};

function getFinalWordsToDisplayWin(state, clickedAorB, targetConnectWordIndex) {
    const clickedSynsetData = state.nextSynsets[clickedAorB];
    const allWordsArray = gameGraph[clickedSynsetData.id][2];
    const displayWordIndices = pruneArray([clickedSynsetData.connectWords[1], targetConnectWordIndex], true);
    const wordsArray = displayWordIndices.map(index => allWordsArray[index]);
    return wordsStrFromArray(wordsArray);
};

function pruneDisplayWords(state, connectingPointers='both') {
    // ConnectingPointers can be 'a', 'b', or 'both' (default).

    const allWordsArray = gameGraph[state.currentSynsetId][2];

    let connectingPointersArray;
    if (connectingPointers === 'both') connectingPointersArray = ['a', 'b'];
    else connectingPointersArray = [connectingPointers];  // ConnectingPointers is a string, either 'a' or 'b'.

    // Get indices for the words to display.
    const displayWordIndices = [state.currentSynsetConnectWord];
    for (const aOrB of connectingPointersArray) {
        if (state.nextSynsets[aOrB] !== null) {
            displayWordIndices.push(state.nextSynsets[aOrB].connectWords[0]);
        };
    };

    const displayWordIndicesPruned = pruneArray(displayWordIndices);
    if (displayWordIndicesPruned.length === 0) {
        const bOrA = {a: 'b', b: 'a'}[connectingPointers];  // Switch a and b.
        if (connectingPointers === 'both' || state.nextSynsets[bOrA] === null) {
            // No specific target words before or after, so use first word for display.
            displayWordIndicesPruned.push(0);
        } else {
            // ConnectingPointers is either 'a' or 'b'.
            const connectWordIndex = state.nextSynsets[bOrA].connectWords[0];
            displayWordIndicesPruned.push(Math.max(connectWordIndex, 0));  // Turns -1 to 0.
        };
    };

    const prunedWordsArray = displayWordIndicesPruned.map(index => allWordsArray[index]);
    const prunedWords = wordsStrFromArray(prunedWordsArray);
    return prunedWords;
};

function wordsStrFromArray(wordsArrayInput, firstIndex=null) {
    // All words to be placed in returned string are in wordsArrayInput.
    // FirstIndex refers to the word that should be placed first in the final string.

    let wordsArray;
    if (firstIndex !== null) {
        // Create wordsArray from wordsArrayInput, putting firstIndex word first.
        const wordsArrayInputSlice = wordsArrayInput.slice();
        const removedWordInArray = wordsArrayInputSlice.splice(firstIndex, 1);  // Remove word from wordsArrayInputSlice.
        wordsArray = [removedWordInArray[0]];
        wordsArrayInputSlice.forEach(word => wordsArray.push(word));
    } else {
        wordsArray = wordsArrayInput;
    };

    let synsetWordString = '';
    for (let wordNum = 0; wordNum < wordsArray.length; wordNum++) {
        if (wordNum > 0) synsetWordString += ', ';
        synsetWordString += wordsArray[wordNum];
    };
    return synsetWordString;
};

function pruneArray(inputArray, disallowEmptyList=false) {
    // Removes -1 and duplicate values from inputArray (retaining only the first appearance of a duplicated value).
    // If disallowEmptyList is true, an empty inputArray results in [0] being returned.
    const prevElements = new Set();
    const prunedArray = [];
    for (const elem of inputArray) {
        if (elem !== -1 && prevElements.has(elem) === false) {
            prevElements.add(elem);
            prunedArray.push(elem);
        };
    };
    if (disallowEmptyList && prunedArray.length === 0) return [0];
    return prunedArray;
};

function getUpdatedPointersObj(rootSynsetId) {
    // Return object = {result: cont/win/lose, data: data}
    // If result is 'lose', data is undefined.
    // If result is 'win', data = {phrase: finalPointerPhrase, connectWords: finalPointerConnectWords}.
    // If result is 'cont', data is updatedPointersObj.
        // updatedPointersObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords}

    const currentSynsetData = gameGraph[rootSynsetId];

    // Swap pointer ordering randomly.
    let pointerLetterNames = ['a', 'b'];
    if (Math.random() < 0.5) pointerLetterNames = ['b', 'a'];

    const updatedPointersObj = {a: null, b: null};
    
    let pointerGroup = 0;  // Correct is at 0; decoy is at 1.
    for (const aOrB of pointerLetterNames) {
    
        const allGroupPointerIndices = Object.keys(currentSynsetData[pointerGroup]);

        if (allGroupPointerIndices.length > 0) {

            // Choose leastRecentIndices from allGroupPointerIndices.
            let leastRecentIndices = [];
            let leastRecentStepNum = Infinity;
            for (const thisIndex of allGroupPointerIndices) {
                const thisStepNum = nodeOrder[thisIndex];
                if (thisStepNum < leastRecentStepNum) {
                    leastRecentIndices = [thisIndex];
                    leastRecentStepNum = thisStepNum;
                } else if (thisStepNum === leastRecentStepNum) {
                    leastRecentIndices.push(thisIndex);
                };
            };

            const pointerIndex = Number(randChoice(leastRecentIndices));  // Select random pointerIndex from leastRecentIndices.
            const pointerData = currentSynsetData[pointerGroup][pointerIndex];
            const pointerPhrase = pointerSymbolToPhrase(pointerData[0]);
            const pointerWords = pointerData.slice(1);

            if (allGroupPointerIndices.includes(String(targetSynsetId))) {
                return {result: 'win', data: {phrase: pointerPhrase, connectWords: pointerWords}};
            };

            updatedPointersObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords};

        } else {
            // allGroupPointerIndices.length <= 0
            // Should not happen. Synsets should always have at least 1 correct and decoy pointer unless target or strike limit is reached.
            return {result: 'lose'};
        };

        pointerGroup = 1;  // Was 0.
    };

    return {result: 'cont', data: updatedPointersObj};
};

function pointerSymbolToPhrase(pointerSymbol) {
    const pointerKey = {
        '^': 'which is related to',  // non-reflexive
        // '__start': {'name': 'start', 'phrase': '(start marker)',  // custom pointer type
        // '__end': {'name': 'end', 'phrase': '(end marker)',  // custom pointer type
        '?p': 'which is the same word as',  // custom pointer type  // self-reflexive
        '!': 'which is the opposite of',  // self-reflexive
        '&': 'which is similar to',  // self-reflexive
        '$': 'which is a related verb to',  // self-reflexive
        '=': 'which is a value or attribute of',  // self-reflexive
        '+': 'which has the same root form as',  // self-reflexive
        // Remaining pointers are ordered with reflexive pointers paired together.
        '@': 'which is a kind of',
        '~': 'a kind of which is',
        '@i': 'which is an instance of',
        '~i': 'an instance of which is',
        '#m': 'which is a member of',
        '%m': 'a member of which is',
        '#s': 'which is a substance of',
        '%s': 'a substance of which is',
        '#p': 'which is a part of',
        '%p': 'a part of which is',
        ';c': 'which is associated with the category',
        '-c': 'which is a category sometimes associated with',
        ';r':'which is associated with the region',
        '-r': 'which is a region sometimes associated with',
        ';u': 'which is associated with the usage',
        '-u': 'which is a usage sometimes associated with',
        '<': 'which is an adjective derived from the verb',
        '<x': 'which is the root verb for the adjective',  // custom reflex pointer
        '\\': 'which is of or pertaining to',
        '\\x': 'which is the basis for',  // custom reflex pointer
        '*': 'which cannot be done without',
        '*x': 'which is always done with',  // custom reflex pointer
        '>': 'which is caused by',
        '>x': 'which can cause',  // custom reflex pointer
    };
    return pointerKey[pointerSymbol];
};


// Utility Functions

function randChoice(array) {
    if (array.length === 0) return null;
    const index = Math.floor(Math.random() * array.length);
    return array[index];
};


// ========================================


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Game />);
