import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';


// New games generate at 6am UTC (10pm Pacific previous day, 3pm Japan day of)

// function pad(number) {
//     return String(number).padStart(2, '0');
// };

// const currentDate = new Date();
// currentDate.setUTCHours(currentDate.getUTCHours() - 6);  // Subtract 6 hours from UTC time so that 6am registers to 12am.
// const gameName = `${currentDate.getUTCFullYear()}-${pad(currentDate.getUTCMonth() + 1)}-${pad(currentDate.getUTCDate())}`;
// console.log(gameName)


console.log(process.env.PUBLIC_URL);


const gameName = 'current_game';
// const gameDataURL = `http://127.0.0.1:5000/${gameName}.json`;
// const gameDataURL = `/${gameName}.json`;
const gameDataURL = `/data`;



let gameGraph;
let startSynsetId;
let targetSynsetId;
let totalStrikes;
function loadGameData(data) {
    gameGraph = data[0];
    startSynsetId = data[1];
    targetSynsetId = data[2];
    totalStrikes = data[3];
};


class Game extends React.Component {

    constructor(props) {
        // console.log('Start synset words', gameGraph[startSynsetId][2]);
        super(props);

        this.state = {
            status: 'load',
            mounted: false,
            stepCount: 1,
            strikeCount: 0,
            prevSynsetsWords: [],
            // currentSynsetId: startSynsetId,
            currentSynsetConnectWord: -1,
            nextSynsets: {a: null, b: null},  // {a: [0/1 means correct/decoy, synsetId], b: [ ... ] }
            targetPointerPhrase: '',
            // targetWords: wordsStrFromArray(gameGraph[targetSynsetId][2], true),
        };


        fetch(gameDataURL)
            .then((response) => response.json())
            // .then((data) => gameData = data);
            .then((data) => {

                setTimeout(() => {
                loadGameData(data);
                this.setState({
                    currentSynsetId: startSynsetId, 
                    targetWords: wordsStrFromArray(gameGraph[targetSynsetId][2], true),
                    status: 'play',
                });
                }, 2000)

                setTimeout(() => {
                if (this.state.mounted) this.choose();
                }, 4000)
            });



        // this.state = {
        //     status: 'play',
        //     stepCount: 1,
        //     strikeCount: 0,
        //     // prevSynsetsIds: [],
        //     prevSynsetsWords: [],
        //     currentSynsetId: startSynsetId,
        //     currentSynsetConnectWord: -1,
        //     nextSynsets: {a: null, b: null},  // {a: [0/1 means correct/decoy, synsetId], b: [ ... ] }
        //     targetPointerPhrase: '',
        //     targetWords: wordsStrFromArray(gameGraph[targetSynsetId][2], true),
        // };
    };

    componentDidMount(prevProps) {
        this.setState({mounted: true})
        if (this.state.status !== 'load') this.choose();
    };

    choose(clickedAorB=null) {  // To init at game start, run choose(null).

        // console.log('mounted: ', this.state.mounted)
        // console.log('status: ', this.state.status)


        this.setState((prevState) => {

            if (prevState.status !== 'play') return {};

            const stateChangeObj = {};
            const addToPrevSynsetsWords = [];
            let pointerRoot;

            if (clickedAorB !== null) {
                // updatedNextSynsetsObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords};

                // Update stepCount and currentSynsetId.
                const updatedCurrentSynsetId = prevState.nextSynsets[clickedAorB].id;
                stateChangeObj['currentSynsetId'] = updatedCurrentSynsetId;
                stateChangeObj['stepCount'] = prevState.stepCount + 1;
                stateChangeObj['currentSynsetConnectWord'] = prevState.nextSynsets[clickedAorB].connectWords[1];
                const wordsFromCurrToPrev = getCurrentWordsToDisplay(prevState, clickedAorB);
                addToPrevSynsetsWords.push(wordsFromCurrToPrev);

                if (prevState.nextSynsets[clickedAorB].group === 1) {
                    // Add strike.
                    const updatedStrikeCount = prevState.strikeCount + 1;
                    stateChangeObj['strikeCount'] = updatedStrikeCount;
                    if (updatedStrikeCount >= totalStrikes) {
                        stateChangeObj['status'] = 'lose';
                        // stateChangeObj['prevSynsetsIds'] = prevState.prevSynsetsIds.concat(addToPrevSynsetsWords, [updatedCurrentSynsetId]);

                        const wordsFromClickedToPrev = getFinalWordsToDisplayLose(prevState, clickedAorB);
                        stateChangeObj['prevSynsetsWords'] = prevState.prevSynsetsWords.concat(addToPrevSynsetsWords, [wordsFromClickedToPrev]);

                        console.log('* current words: ', gameGraph[updatedCurrentSynsetId][2])
                        return stateChangeObj;  // Skip updating nextSynsets.
                    };
                };

                pointerRoot = updatedCurrentSynsetId;

            } else {
                // clickedAorB === null
                pointerRoot = prevState.currentSynsetId;
            };


            // Get nextSynsets.
            const updatedPointersObj = getUpdatedPointersObj(pointerRoot);

            // console.log('* current words: ', gameGraph[pointerRoot][2])

            if (['win', 'lose'].includes(updatedPointersObj.result)) {
                stateChangeObj['status'] = updatedPointersObj.result;
                // stateChangeObj['prevSynsetsIds'] = prevState.prevSynsetsIds.concat([prevState.currentSynsetId]);
                if (updatedPointersObj.result === 'win') {

                    // return {result: 'win', data: {phrase: pointerPhrase, connectWords: pointerWords}};
                    stateChangeObj['targetPointerPhrase'] = updatedPointersObj.data.phrase;

                    const wordsFromClickedToPrev = getFinalWordsToDisplayWin(prevState, clickedAorB, updatedPointersObj.data.connectWords[0]);
                    addToPrevSynsetsWords.push(wordsFromClickedToPrev);

                    const allTargetWords = gameGraph[targetSynsetId][2];
                    const displayTargetWordIndex = updatedPointersObj.data.connectWords[1];
                    stateChangeObj['targetWords'] = allTargetWords[displayTargetWordIndex];

                } else if (updatedPointersObj.result === 'lose') {
                    const wordsFromClickedToPrev = getFinalWordsToDisplayLose(prevState, clickedAorB);
                    addToPrevSynsetsWords.push(wordsFromClickedToPrev);
                };

            } else {
                stateChangeObj['nextSynsets'] = updatedPointersObj.data;
                // console.log('* a words: ', gameGraph[updatedPointersObj.data.a.id][2])
                // console.log('* b words: ', gameGraph[updatedPointersObj.data.b.id][2])
            };

            stateChangeObj['prevSynsetsWords'] = prevState.prevSynsetsWords.concat(addToPrevSynsetsWords);
            return stateChangeObj;
        });
    };

    render() {

        if (this.state.status !== 'load') {  // Indent all below.


        // mounted / will unmount ???? !@#$
        if (['win', 'lose'].includes(this.state.status)) {
            document.body.classList.add(this.state.status);
        };

        // const prevSynsetsWordsArray = this.state.prevSynsetsIds.map(synsetIndex => gameGraph[synsetIndex][2]);
        const prevSynsetsWordsArray = this.state.prevSynsetsWords;

        // const allCurrentWordsArray = gameGraph[this.state.currentSynsetId][2];
        // const pruneIndices = [this.state.currentSynsetConnectWord];
        // for (const aOrB of ['a', 'b']) {
        //     if (this.state.nextSynsets[aOrB] !== null) {
        //         pruneIndices.push(this.state.nextSynsets[aOrB].connectWords[0]);
        //     };
        // };
        // const pruneIndicesPruned = pruneArray(pruneIndices, true);
        // const prunedCurrentWordsArray = pruneIndicesPruned.map(index => allCurrentWordsArray[index]);
        // const prunedCurrentWords = wordsStrFromArray(prunedCurrentWordsArray);

        const currentWords = getCurrentWordsToDisplay(this.state);

        return (
            <>
                <div id="stats-bar">
                    <StrikeArea
                        currentStrikeCount={this.state.strikeCount}
                        totalStrikeCount={totalStrikes}
                    />
                    <ArrowArea
                        currentStepCount={this.state.stepCount}
                    />
                </div>

                <WinLoseHeading
                    status={this.state.status}
                    stepCount={this.state.stepCount}
                />

                <PreviousSynsets
                    synsets={prevSynsetsWordsArray}
                />

                <CurrentSynset
                    status={this.state.status}
                    words={currentWords}
                />

                <div id="next-synset-area">
                    <div id="next-syn-a-gutter"></div>
                    <div id="next-synsets">
                        <NextSynset
                            id={'b'}
                            choose={() => this.choose('b')}
                            gameState={this.state}
                        />
                        <NextSynset
                            id={'a'}
                            choose={() => this.choose('a')}
                            gameState={this.state}
                        />
                    </div>
                    <div id="next-syn-b-gutter"></div>
                </div>

                <Target
                    status={this.state.status}
                    targetPointerPhrase={this.state.targetPointerPhrase}
                    targetWords={this.state.targetWords}
                />
            </>
        )
        } else {
            return(<h1>Loading...</h1>)
        }
    }
};


function getCurrentWordsToDisplay(state, connectingPointers='both') {
    // ConnectingPointers can be 'a', 'b', or 'both' (default).

    const allCurrentWordsArray = gameGraph[state.currentSynsetId][2];

    let connectingPointersArray;
    if (connectingPointers === 'both') connectingPointersArray = ['a', 'b'];
    else connectingPointersArray = [connectingPointers];  // ConnectingPointers is either 'a' or 'b'.

    // Get indices for the words to display.
    const displayWordIndices = [state.currentSynsetConnectWord];
    for (const aOrB of connectingPointersArray) {
        if (state.nextSynsets[aOrB] !== null) {
            displayWordIndices.push(state.nextSynsets[aOrB].connectWords[0]);
        };
    };
    // const displayWordIndicesPruned = pruneArray(displayWordIndices, true);

    const displayWordIndicesPruned = pruneArray(displayWordIndices);
    if (displayWordIndicesPruned.length === 0) {
        if (connectingPointers === 'both') {
            // No specific target words on either side, so use first for display.
            displayWordIndicesPruned.push(0);
        } else {
            // ConnectingPointers is either 'a' or 'b'.
            const bOrA = {a: 'b', b: 'a'}[connectingPointers];  // Switch a and b.
            if (state.nextSynsets[bOrA] !== null) {
                const connectWordIndex = state.nextSynsets[bOrA].connectWords[0];
                displayWordIndicesPruned.push(Math.max(connectWordIndex, 0));  // Turns -1 to 0.
            };
        };
    };

    const prunedCurrentWordsArray = displayWordIndicesPruned.map(index => allCurrentWordsArray[index]);
    const prunedCurrentWords = wordsStrFromArray(prunedCurrentWordsArray);
    // console.log(state.currentSynsetConnectWord)
    // console.log(displayWordIndices)
    // console.log(prunedCurrentWords)
    return prunedCurrentWords;
};


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


function StrikeArea(props) {

    function renderStrikeBox(strikeNum) {
        if (strikeNum < props.currentStrikeCount) {
            return (
                <div key={strikeNum} className="strike-box">
                    <img src="/red_x.png"/>
                </div>
            )
        } else {
            return (
                <div key={strikeNum} className="strike-box"></div>
            )
        };
    };

    const strikeNums = Array.from(Array(props.totalStrikeCount).keys());  // [0, 1, ... , totalStrikeCount - 1]

    return (
        <div id="strike-area">
            { strikeNums.map(strikeNum => renderStrikeBox(strikeNum)) }
        </div>
    )
};


function ArrowArea(props) {

    const steps = Array.from(Array(props.currentStepCount).keys());
    // [0, 1, ... , currentStepCount - 1]

    return (
        <div id="arrow-area">
            { steps.map(stepNum => { return (
                <img key={stepNum} src="/arrow_outline.png"/>
            )})}
        </div>
    )
};


function WinLoseHeading(props) {
    if (props.status === 'lose') {
        return (
            <h1 id='lose-heading'>LOSE</h1>
        )
    } else if (props.status === 'win') {
        const winStats = `in ${props.stepCount} steps`;
        return (
            <h1 id='win-heading'
                >WIN
                <span id='win-stats'>{winStats}</span>
            </h1>
        )
    };
};


function PreviousSynsets(props) {
    return (
        <div id="prev-synsets">
            { props.synsets.map((words, index) => { return (
                // <div key={index} className="words">{wordsStrFromArray(words)}</div>
                <div key={index} className="words">{words}</div>
            )})}
        </div>
    )
};


function CurrentSynset(props) {
    if (props.status === 'play') {
        return (
            <div id="curr-synset">
                <span className="words">{props.words}</span>
            </div>
        )
    };
};


function NextSynset(props) {

    if (props.gameState.status !== 'play') return;

    const elemId = `next-syn-${props.id}-text`;

    if (props.gameState.nextSynsets.a === null) {
        // Return empty html structure. Data not initialized.
        return (
            <div
                id={elemId}
                // onClick={props.choose(props.id)}
            >
                <span className="pointer">pointer</span>
                <br/>
                <span className="words">words </span><span className="pos">pos</span>
                <br/>
                <span className="gloss">gloss</span>
            </div>
        )

    } else {
        // updatedNextSynsetsObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords};
        const pointerData = props.gameState.nextSynsets[props.id];
        const synsetData = gameGraph[pointerData.id];
        const pointerPhrase = pointerData.phrase;
        // const pointerSymbol = gameGraph[props.gameState.currentSynsetId][pointerData.group][pointerData.id][0];
        let wordsStr = wordsStrFromArray(synsetData[2], true, [pointerData.connectWords[1]]);
        wordsStr += [' (correct) ', ' (decoy) '][pointerData.group];  // let wordsStr debug !@#$!@#$
        return (
            <div
                id={elemId}
                // onClick={props.choose(props.id)}
                onClick={props.choose}
            >
                {/* <span className="pointer">{pointerSymbolToPhrase(pointerSymbol)}</span> */}
                <span className="pointer">{pointerPhrase}</span>
                <br/>
                <span className="words">{wordsStr}</span><span className="pos">{synsetData[3]}</span>
                <br/>
                <span className="gloss">{synsetData[4]}</span>
            </div>
        )
    };
};


function Target(props) {

    let targetMargin = null;
    let targetHeading = null;
    let targetPointerPhrase = <span className="pointer">{props.targetPointerPhrase}</span>
    if (props.status !== 'win') {
        targetMargin = <div id="target-margin"></div>
        targetHeading = <span id="target-heading">TARGET</span>;
        targetPointerPhrase = null;
    };
    
    return (
        <>
            {targetMargin}
            <div id="target">
                {targetHeading}
                {targetPointerPhrase}
                <br/>
                <span className="words">{props.targetWords}</span><span className="pos">{gameGraph[targetSynsetId][3]}</span>&nbsp;&nbsp;
                <br/>
                <span className="gloss">{gameGraph[targetSynsetId][4]}</span>
            </div>
        </>
    )
};


function getUpdatedPointersObj(rootSynsetId) {
    // Returns object = {result: cont/win/lose, data: data}
    // If result is 'cont', data is updatedNextSynsetsObj.
    // If result is 'win', data is finalPointer.
    // If result is 'lose', no data is returned.

    const currentSynsetData = gameGraph[rootSynsetId];

    let pointerLetterNames = ['a', 'b'];
    if (Math.random() < 0.5) pointerLetterNames = ['b', 'a'];  // !@#$ debug

    const updatedNextSynsetsObj = {a: null, b: null};
    
    let pointerGroup = 0;  // Correct is at 0, decoy is at 1.
    for (const aOrB of pointerLetterNames) {
    
        const allGroupPointerIndices = Object.keys(currentSynsetData[pointerGroup]).slice();  // slice debug !@#$

        if (allGroupPointerIndices.length > 0) {

            const pointerIndex = Number(allGroupPointerIndices[0]);  // Getting first. Should instead be least recent.
            const pointerData = currentSynsetData[pointerGroup][pointerIndex];
            const pointerPhrase = pointerSymbolToPhrase(pointerData[0]);
            const pointerWords = pointerData.slice(1);

            if (allGroupPointerIndices.includes(String(targetSynsetId))) {
                // win(pointerPhrase);
                return {result: 'win', data: {phrase: pointerPhrase, connectWords: pointerWords}};
            };

            // updatedNextSynsetsObj[aOrB] = [pointerDataIndex, pointerIndex];
            updatedNextSynsetsObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords};

        } else {
            // Should not happen. Synsets should always have at least 1 correct and decoy pointer unless target or strike limit is reached.
            console.log('should not happen?????? No')
            // lose();
            return {result: 'lose'};
        };

        pointerGroup = 1;
    };

    return {result: 'cont', data: updatedNextSynsetsObj};
};


function pruneArray(array, disallowEmptyList=false) {
    // Remove duplicates (retaining first appearance of a duplicated value) and -1.
    // If disallowEmptyList is true, returns [0].
    const prevElements = new Set();
    const prunedArray = [];
    for (const elem of array) {
        if (elem !== -1 && prevElements.has(elem) === false) {
            prevElements.add(elem);
            prunedArray.push(elem);
        };
    };
    if (disallowEmptyList && prunedArray.length === 0) return [0];
    return prunedArray;
};


function wordsStrFromArray(wordsArrayInput, addEndingSpace=false, firstIndices=null) {

    // todo handle firstIndices -1, duplicate indices!

    // Reorder wordsArrayInput, putting firstIndices first.
    let wordsArray;
    if (firstIndices !== null) {

        // Remove duplicates and -1.
        const firstIndicesPruned = pruneArray(firstIndices);
        // const firstIndicesSet = new Set();
        // const firstIndicesPruned = [];
        // for (const index of firstIndices) {
        //     if (index !== -1 && firstIndicesSet.has(index) === false) {
        //         firstIndicesSet.add(index);
        //         firstIndicesPruned.push(index);
        //     };
        // };


        // todo handle index < 0 or index out of range.


        // Extract elements that go first from wordsArrayInputSlice, and place in wordsArray in order.
        wordsArray = [];
        const wordsArrayInputSlice = wordsArrayInput.slice();
        for (const index of firstIndicesPruned) {
            const removedWordInArray = wordsArrayInputSlice.splice(index, 1);
            wordsArray.push(removedWordInArray[0]);
        };

        // Add non-prioritized words from wordsArrayInputSlice after prioiritzed words in wordsArray.
        wordsArrayInputSlice.forEach(word => wordsArray.push(word));
    } else {
        wordsArray = wordsArrayInput;
    };


    let synsetWordString = '';
    for (let wordNum = 0; wordNum < wordsArray.length; wordNum++) {
        if (wordNum > 0) synsetWordString += ', ';
        synsetWordString += wordsArray[wordNum];
    };
    if (addEndingSpace) synsetWordString += ' ';
    return synsetWordString;
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
        '<x': 'which is the root verb for the adjective',
        // custom reflex pointer (above)
        '\\': 'which is of or pertaining to',
        '\\x': 'which is the basis for',  // custom reflex pointer
        '*': 'which cannot be done without',
        '*x': 'which is always done with',  // custom reflex pointer
        '>': 'which is caused by',
        '>x': 'which can cause',  // custom reflex pointer
    };
    return pointerKey[pointerSymbol];
};


// ========================================


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Game />);
