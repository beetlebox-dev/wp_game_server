import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';






// cd /Users/john/Desktop/Apps/GoogleCLI/beetleboxdev/sources/wp-game-server/frontend
// npm start
// http://localhost:3000

// For production:
// npm run build



// Test going to oldest synset visited when a choice is present. Map out synset map to see.









// New games generate at 5:59am UTC (9:59pm Pacific previous day, 2:59pm Japan day of) (add 1 hour during daylight savings).

// game_graph[node_index] = [correct_pointers_object, decoy_pointers_object, words_str_list, pos_str, gloss_str]
// x_pointers_object = {node_index: pointer, ... }
// pointer = [pointer_symbol, source_word, target_word]


// Transition animation of next synset area.
const minTransSecs = 1;  // The total seconds to transition min-height property from current to 0vh.
const minMaxTransRatio = 4;  // maxTransSecs / minTransSecs
const maxTransSecs = minTransSecs * minMaxTransRatio;  // The total seconds to transition max-height property from current to 1vh.
const transTimingFunc = 'cubic-bezier(0.6, 0, 1, 1)';

const gameDataURL = process.env.REACT_APP_GAME_DATA_URL;
let nodeOrder, gameGraph, startSynsetId, targetSynsetId, totalStrikes;


class Game extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            status: 'load',
            mounted: false,
            stepCount: 1,
            strikeCount: 0,
            prevSynsets: [],
            currentSynsetConnectWord: -1,
            nextSynsets: {a: null, b: null},  // {a: [0/1 means correct/decoy, synsetId], b: [ ... ] }
            // targetPointerPhrase: '',
            // prevSynsetsAddedCount: 0,

        };


        console.log('fetching:', gameDataURL)
        fetch(gameDataURL)
            // .then((response) => console.log(response))
            .then((response) => response.json())
            .then((data) => {

                setTimeout(() => {
                loadGameData(data);
                nodeOrder = Array(gameGraph.length).fill(0);
                this.setState({
                    currentSynsetId: startSynsetId, 
                    targetWords: wordsStrFromArray(gameGraph[targetSynsetId][2], true),
                    status: 'start',
                });
                this.choose();
                }, 1000)

                // setTimeout(() => {
                // if (this.state.mounted) this.choose();
                // }, 4000)
            });
    };

    componentDidMount(prevProps) {
        this.setState({mounted: true})
        // if (this.state.status !== 'load') this.choose();

        // setTimeout(() => { 
        // q('a');
        // q('b');
        // }, 0)

        // this.xformNewPrevSynsets(this.state.prevSynsetsAddedCount);

    }

    componentDidUpdate(prevProps) {
    //     // Check if data changed in prevPorps first!

    //     // w('a');
    //     // w('b');
    //     // setTimeout(() => { 
    //     // // w('a');
    //     // // w('b');
    //     // q('a');
    //     // q('b');
    //     // // w(this.props.id)
    //     // // q(this.props.id)
    //     // }, 0)
        // this.xformNewPrevSynsets(this.state.prevSynsetsAddedCount);
    }



    xformNewPrevSynsets(addCount) {

        if (addCount < 1) return;
    
        for (let elemNum = 0; elemNum < addCount; elemNum++) {
            const elem = document.querySelector(`xform-${elemNum}`);
            elem.style.padding = '0'
            elem.style.margin = '3vw'
        }

        // #prev-synsets {
        // margin: 3vw 0;
        // /* color: hsl(133, 0%, 60%); */
        // color: hsla(0, 0%, 100%, 70%);
        // }
        // #prev-synsets .pointer {
        // color: hsla(0, 0%, 100%, 50%);
        // font-size: 0.8rem;



        // this.setState({prevSynsetsAddedCount: 0})
    }



    resetGame() {

        this.setState({
            stepCount: 1,
            strikeCount: 0,
            prevSynsets: [],
            currentSynsetConnectWord: -1,
            nextSynsets: {a: null, b: null},  // {a: [0/1 means correct/decoy, synsetId], b: [ ... ] }
            // targetPointerPhrase: '',
            //
            currentSynsetId: startSynsetId, 
            targetWords: wordsStrFromArray(gameGraph[targetSynsetId][2], true),
            status: 'start',
            // prevSynsetsAddedCount: 0,
        })

        nodeOrder = Array(gameGraph.length).fill(0);

        this.choose();


        // this.choose();
        // this.setState({status: 'play'})
        // console.log('start game')
    };

    choose(clickedAorB=null) {  // To init at game start, run choose(null).

        console.log('################# choose')
        // console.log('choose')

        // console.log('mounted: ', this.state.mounted)
        // console.log('status: ', this.state.status)


        this.setState((prevState) => {

            if (prevState.status !== 'play' && prevState.status !== 'start') return {};

            const stateChangeObj = {};
            const addToprevSynsets = [];
            let pointerRoot;

            if (clickedAorB !== null) {
                // updatedNextSynsetsObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords};

                const nextSynsetData = prevState.nextSynsets[clickedAorB];

                // Update stepCount and currentSynsetId.
                const updatedCurrentSynsetId = nextSynsetData.id;
                stateChangeObj['currentSynsetId'] = updatedCurrentSynsetId;
                stateChangeObj['stepCount'] = prevState.stepCount + 1;
                stateChangeObj['currentSynsetConnectWord'] = nextSynsetData.connectWords[1];
                const wordsFromCurrToPrev = getCurrentWordsToDisplay(prevState, clickedAorB);
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
                        // const pointerPhraseFromClickedToPrev = prevState.nextSynsets[clickedAorB].phrase;
                        const finalPrevSynsetObj = {words: wordsFromClickedToPrev, pointer: null};
                        stateChangeObj['prevSynsets'] = prevState.prevSynsets.concat(addToprevSynsets, [finalPrevSynsetObj]);

                        console.log('* current words: ', gameGraph[updatedCurrentSynsetId][2])
                        // stateChangeObj['prevSynsetsAddedCount'] = addToprevSynsets.length;
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

            console.log(nodeOrder)



            // Get nextSynsets.
            const updatedPointersObj = getUpdatedPointersObj(pointerRoot);

            // console.log('* current words: ', gameGraph[pointerRoot][2])

            if (['win', 'lose'].includes(updatedPointersObj.result)) {
                stateChangeObj['status'] = updatedPointersObj.result;
                if (updatedPointersObj.result === 'win') {

                    // return {result: 'win', data: {phrase: pointerPhrase, connectWords: pointerWords}};
                    // stateChangeObj['targetPointerPhrase'] = updatedPointersObj.data.phrase;

                    const wordsFromClickedToPrev = getFinalWordsToDisplayWin(prevState, clickedAorB, updatedPointersObj.data.connectWords[0]);
                    const pointerPhraseFromClickedToPrev = prevState.nextSynsets[clickedAorB].phrase;
                    const finalPrevSynsetObj = {words: wordsFromClickedToPrev, pointer: pointerPhraseFromClickedToPrev};
                    addToprevSynsets.push(finalPrevSynsetObj);

                    const allTargetWords = gameGraph[targetSynsetId][2];
                    const displayTargetWordIndex = Math.max(updatedPointersObj.data.connectWords[1], 0);  // Change -1 (any word) to 0 (first word).
                    // console.log('allTargetWords:', allTargetWords)
                    // console.log('displayTargetWordIndex:', displayTargetWordIndex)
                    // console.log('allTargetWords[displayTargetWordIndex]:', allTargetWords[displayTargetWordIndex])
                    stateChangeObj['targetWords'] = allTargetWords[displayTargetWordIndex] + ' ';
                    // wordsStrFromArray(gameGraph[targetSynsetId][2], true)
                    
                } else if (updatedPointersObj.result === 'lose') {
                    const wordsFromClickedToPrev = getFinalWordsToDisplayLose(prevState, clickedAorB);
                    // const pointerPhraseFromClickedToPrev = prevState.nextSynsets[clickedAorB].phrase;
                    const finalPrevSynsetObj = {words: wordsFromClickedToPrev, pointer: null};
                    console.log('finalPrevSynsetObj: ', finalPrevSynsetObj)
                    addToprevSynsets.push(finalPrevSynsetObj);
                };

            } else {
                stateChangeObj['nextSynsets'] = updatedPointersObj.data;
                // console.log('* a words: ', gameGraph[updatedPointersObj.data.a.id][2])
                // console.log('* b words: ', gameGraph[updatedPointersObj.data.b.id][2])
            };

            stateChangeObj['prevSynsets'] = prevState.prevSynsets.concat(addToprevSynsets);
            // stateChangeObj['prevSynsetsAddedCount'] = addToprevSynsets.length;
            return stateChangeObj;
        });
    };

    render() {

        // console.log('target words: ', this.state.targetWords)

        if (this.state.status === 'load') {  // Indent all below.
            return (<h1>Loading...</h1>)
        };

        // mounted / will unmount ???? !@#$
        if (['win', 'lose'].includes(this.state.status)) {
            document.body.classList.add(this.state.status);
        };

        // const prevSynsetsArray = this.state.prevSynsetsIds.map(synsetIndex => gameGraph[synsetIndex][2]);
        const prevSynsetsArray = this.state.prevSynsets;

        const currentWords = getCurrentWordsToDisplay(this.state) + ' ';
        let currentPos = '';
        let currentGloss = '';

        // let startBox = null;
        let statusBar = null;
        let nextSynsetArea = null;

        const resetButtons = {start: null, lose: null, win: null};
        const buttonText = {start: 'BEGIN', lose: 'RESET', win: 'RESET'}[this.state.status];
        if (this.state.status === 'start') {
            resetButtons.start = 
                <ResetButton
                    text={buttonText}
                    handleClick={() => {
                        // this.resetGame();
                        // this.choose();
                        this.setState({status: 'play'});
                    }}
                />
        } else {
            resetButtons[this.state.status] = 
                <ResetButton
                    text={buttonText}
                    handleClick={() => {
                        this.resetGame();
                        // this.setState({status: 'start'});
                    }}
                />
        };

        if (this.state.status !== 'load' && this.state.status !== 'start') {

            statusBar =
                <div id="stats-bar">
                    <StrikeArea
                        currentStrikeCount={this.state.strikeCount}
                        totalStrikeCount={totalStrikes}
                    />
                    <ArrowArea
                        currentStepCount={this.state.stepCount}
                    />
                </div>

            const futureChoiceArea = [];
            for (let i = 0; i < 4; i++) {
                futureChoiceArea.push(<div className='a' key={i * 2}></div>, <div className='b' key={i * 2 + 1}></div>)
            };

            if (this.state.status !== 'win' && this.state.status !== 'lose') {
                nextSynsetArea =
                    <div id='next-synset-col'>
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
                        <div id='future-choice-area'>{futureChoiceArea}</div>
                    </div>
            };
        } else {
            currentPos = gameGraph[this.state.currentSynsetId][3];
            currentGloss = gameGraph[this.state.currentSynsetId][4];    
        };

        // const futureChoiceArea = [];
        // for (let i = 0; i < 6; i++) {
        //     futureChoiceArea.push(<div className='a' key={i * 2}></div>, <div className='b' key={i * 2 + 1}></div>)
        // };

        return (
            <>
                {statusBar}
                {/* <div id="stats-bar">
                    <StrikeArea
                        currentStrikeCount={this.state.strikeCount}
                        totalStrikeCount={totalStrikes}
                    />
                    <ArrowArea
                        currentStepCount={this.state.stepCount}
                    />
                </div> */}

                <WinLoseHeading
                    status={this.state.status}
                    stepCount={this.state.stepCount}
                />

                <PreviousSynsets
                    synsets={prevSynsetsArray}
                    // newCount={prevSynsetsAddedCount}
                />

                <CurrentSynset
                    status={this.state.status}
                    words={currentWords}
                    pos={currentPos}
                    gloss={currentGloss}
                />

                {resetButtons.start}
                {resetButtons.lose}

                {nextSynsetArea}
                {/* <div id='future-choice-area'>{futureChoiceArea}</div> */}

                <Target
                    status={this.state.status}
                    // targetPointerPhrase={this.state.targetPointerPhrase}
                    targetWords={this.state.targetWords}
                />



                {resetButtons.win}
            </>
        )
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


function ResetButton(props) {
    // if (props.status === 'start') {
    //     return (
    //         <button onClick={props.startGame}>BEGIN</button>
    //     )
    // };
    return (
        <button className='reset-button' onClick={props.handleClick}>{props.text}</button>
    )
};


function StrikeArea(props) {

    function renderStrikeBox(strikeNum) {
        if (strikeNum < props.currentStrikeCount) {
            return (
                <div key={strikeNum} className="strike-box">
                    <img src={process.env.PUBLIC_URL + "/red_x.png"}/>
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
                <img key={stepNum} src={process.env.PUBLIC_URL + "/arrow_outline.png"}/>
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
            { props.synsets.map((synsetInfo, index) => {
                // let className = null;
                // if (index >= props.synsets.length - props.newCount) {
                //     className = `xform xform-${index - props.synsets.length + props.newCount}`;
                // }
                return (
                    // <div key={index} className="words">{wordsStrFromArray(words)}</div>
                    <div key={index}>
                    {/* <div key={index} className={className}> */}
                        <span className="words">{synsetInfo.words}</span>
                        <br/>
                        <span className="pointer">{synsetInfo.pointer}</span>
                    </div>
                )
            })}
        </div>
    )
};


//!@#$!@#$!@#$ working here.
function CurrentSynset(props) {
    // let heading = null;
    // if (props.status !== 'load') {
    //     heading = <span id="curr-heading">START</span>;
    // };
    if (props.status === 'play' || props.status === 'start') {

        let heading = null;
        if (props.status === 'start') {
            heading = <><span className="endpoint-heading">START</span><br/></>;
        };

        return (
            <div id="curr-synset">
                {heading}
                <span className="words">{props.words}</span><span className="pos">{props.pos}</span>
                <br/>
                <span className="gloss">{props.gloss}</span>
            </div>
        )
    // } else {

    };
};


class NextSynset extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            mounted: false,
        }
    }

    componentDidMount() {
        this.setState({mounted: true})

        console.log('componentDidMount', this.props.id)
        // nextSynUnrestrictHeightAfterRender(this.props.id)
        setTimeout(() => { 
        nextSynUnrestrictHeightAfterRender(this.props.id)
        }, 0)
    }

    componentDidUpdate(prevProps) {
        console.log('componentDidUpdate', this.props.id)
        // // Check if data changed in prevPorps first!
        // nextSynUnrestrictHeightAfterRender(this.props.id)
        setTimeout(() => { 
        nextSynUnrestrictHeightAfterRender(this.props.id)
        }, 0)
    }

    // getting multiple times! const elemId = `next-syn-${this.props.id}-text`;

    render() {


        if (this.props.gameState.status !== 'play') return;

        console.log('before render', this.props.id)

        if (this.state.mounted) {
            nextSynRestrictHeightBeforeRender(this.props.id)
        }

        const elemId = `next-syn-${this.props.id}-text`;

        if (this.props.gameState.nextSynsets.a === null) {
            // Return empty html structure. Data not initialized.
            return (
                <div
                    id={elemId}
                    // onClick={this.props.choose(this.props.id)}
                >
                    <span className="pointer">pointer</span>
                    {/* <br/> */}
                    <span><span className="words">words </span><span className="pos">pos</span></span>
                    {/* <br/> */}
                    <span className="gloss">gloss</span>
                </div>
            )

        } else {
            // updatedNextSynsetsObj[aOrB] = {group: pointerGroup, id: pointerIndex, phrase: pointerPhrase, connectWords: pointerWords};
            const pointerData = this.props.gameState.nextSynsets[this.props.id];
            const synsetData = gameGraph[pointerData.id];
            const pointerPhrase = pointerData.phrase;
            let wordsStr = wordsStrFromArray(synsetData[2], true, [pointerData.connectWords[1]]);
            // wordsStr += [' (correct) ', ' (decoy) '][pointerData.group];  // let wordsStr debug !@#$!@#$
            return (
                <div
                    id={elemId}
                    // onClick={this.props.choose(this.props.id)}
                    onClick={this.props.choose}
                >
                    {/* <span className="pointer">{pointerSymbolToPhrase(pointerSymbol)}</span> */}
                    <span className="pointer">{pointerPhrase}</span>
                    {/* <br/> */}
                    <span><span className="words">{wordsStr}</span><span className="pos">{synsetData[3]}</span></span>
                    {/* <br/> */}
                    <span className="gloss">{synsetData[4]}</span>
                </div>
            )
        };
    }
};


// function transitionNextSynsetsHeights(id) {
//     const elemId = `next-syn-${id}-text`;
//     const elem = document.getElementById(elemId);
//     // let elemHeight = elem.style.height;
//     const heightDiff = elem.scrollHeight - elem.clientHeight;
//     console.log('###########', id)
//     console.log('elem.scrollHeight', elem.scrollHeight)
//     console.log('elem.clientHeight', elem.clientHeight)
//     console.log('heightDiff', heightDiff)
//     // elem.style.height += heightDiff;
// };

document.addEventListener('keydown', event => {
    // if (event.key === 'q') { q('a'); q('b'); }
    // else if (event.key === 'w') { w('a'); w('b'); };
    // // transitionNextSynsetsHeights('a')
    // // transitionNextSynsetsHeights('b')
    nextSynUnrestrictHeightAfterRender('b')
    nextSynUnrestrictHeightAfterRender('a')

});
function nextSynRestrictHeightBeforeRender(id) {

    console.log('restrict', id)

    // if (id === 'b') return

    const elemId = `next-syn-${id}-text`;
    const elem = document.getElementById(elemId);
    // console.log(elemId)
    // console.log(elem)
    const elemLiveStyles = window.getComputedStyle(elem);

    // console.log('********************')

    // Restrict min/max height to current height instantly.
    // const currentHeightB = elem.offsetHeight;
    const currentHeightB = elemLiveStyles.getPropertyValue('height').slice(0, -2);
    elem.style.minHeight = elem.style.maxHeight = `${currentHeightB}px`;
    // elem.style.minHeight = elem.style.maxHeight = `40px`;
    // elem.style.transitionDuration = '0s';
    elem.style.transition = 'all 0s';


    // console.log('currentHeightB', currentHeightB)
    // console.log('elem.style.minHeight', elem.style.minHeight)
    // console.log('elem.style.maxHeight', elem.style.maxHeight)
    // console.log('elem.style.transitionDuration', elem.style.transitionDuration)
}
function nextSynUnrestrictHeightAfterRender(id) {

    // if (id === 'b') return

    console.log('unrestrict', id)


    const elemId = `next-syn-${id}-text`;
    const elem = document.getElementById(elemId);
    // console.log(elemId)
    // console.log(elem)
    // const elemLiveStyles = window.getComputedStyle(elem);

    // console.log('********************')

    // Unrestrict min/max height gradually over transition time.
    // elem.style.transitionDuration = `${transitionSecs}s`;
    // elem.style.minHeight = '0';
    // elem.style.maxHeight = transitionMaxHeight;

    // elem.style.transitionDuration = `20s`;
    elem.style.transition = `min-height ${minTransSecs}s ${transTimingFunc}, max-height ${maxTransSecs}s ${transTimingFunc}`;
    elem.style.minHeight = '0vh';
    elem.style.maxHeight = '100vh';

    // console.log('elem.style.transitionDuration', elem.style.transitionDuration)
    // console.log('elem.style.minHeight', elem.style.minHeight)
    // console.log('elem.style.maxHeight', elem.style.maxHeight)
    // // const currentHeightB = elem.offsetHeight;
    // const currentHeightB = elemLiveStyles.getPropertyValue('height').slice(0, -2);
    // console.log('currentHeightB', currentHeightB)
}

// // let textHeightTransTimeoutId = null;  // GLOBAL
// function textHeightTrans(elemId) {

//     console.log('********************')
//     console.log(elemId)


//     const transitionSecs = 4;

//     // clearTimeout(textHeightTransTimeoutId);


//     const textBoxB = document.getElementById(elemId);

//     // Restrict min/max height to current height instantly.
//     const currentHeightB = textBoxB.offsetHeight;
//     textBoxB.style.minHeight = textBoxB.style.maxHeight = `${currentHeightB}px`;
//     textBoxB.style.transitionDuration = '0s';

//     console.log('textBoxB.style.transitionDuration', textBoxB.style.transitionDuration)
//     console.log('currentHeightB', currentHeightB)
//     console.log('textBoxB.style.minHeight', textBoxB.style.minHeight)
//     console.log('textBoxB.style.maxHeight', textBoxB.style.maxHeight)


//     // Unrestrict min/max height gradually over transition time.
//     textBoxB.style.transitionDuration = `${transitionSecs}s`;
//     textBoxB.style.minHeight = '0';
//     textBoxB.style.maxHeight = '100vw';

//     console.log('textBoxB.style.transitionDuration', textBoxB.style.transitionDuration)
//     console.log('currentHeightB', currentHeightB)
//     console.log('textBoxB.style.minHeight', textBoxB.style.minHeight)
//     console.log('textBoxB.style.maxHeight', textBoxB.style.maxHeight)

//     // textHeightTransTimeoutId = setTimeout(function () {
//     //     textBoxB.style.transitionDuration = '0';
//     //     const currentHeightB = textBoxB.offsetHeight;
//     //     textBoxB.style.minHeight = textBoxB.style.maxHeight = `${currentHeightB}px`;
//     // }, transitionSecs * 1000);
// }


function Target(props) {

    let targetMargin = null;
    let targetHeading = null;
    // let targetPointerPhrase = <span className="pointer">{props.targetPointerPhrase}</span>
    if (props.status !== 'win') {
        // targetMargin = <div id="target-margin"></div>
        targetHeading = <><span className="endpoint-heading">TARGET</span><br/></>;
        // targetPointerPhrase = null;
    };

    // if (props.status === 'start') targetMargin = <div id="target-margin"></div>
    if (props.status === 'play' || props.status === 'lose') targetMargin = <div id="target-margin" className="draw-top-line"></div>
    
    return (
        <>
            {targetMargin}
            <div id="target">
                {targetHeading}
                {/* {targetPointerPhrase} */}
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

            let bestIndices = [];
            let bestStepNum = Infinity;
            for (const index of allGroupPointerIndices) {
                const thisStepNum = nodeOrder[index];
                console.log(thisStepNum)
                if (thisStepNum < bestStepNum) {
                    bestIndices = [index];
                    bestStepNum = thisStepNum;
                } else if (thisStepNum === bestStepNum) {
                    bestIndices.push(index);
                };
            };
            const pointerIndex = Number(randChoice(bestIndices));
            console.log(allGroupPointerIndices)
            console.log(bestIndices)
            console.log(pointerIndex)

            // const pointerIndex = Number(allGroupPointerIndices[0]);  // Getting first. Should instead be least recent.

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


function randChoice(array) {
    if (array.length === 0) return null;
    const index = Math.floor(Math.random() * array.length);
    return array[index];
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


function loadGameData(data) {
    gameGraph = data[0];
    startSynsetId = data[1];
    targetSynsetId = data[2];
    totalStrikes = data[3];
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
