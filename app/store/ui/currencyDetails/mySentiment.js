/**
 * Created by workplace on 23/03/2017.
 * @flow
 */

'use strict';

import ReactNative, {
    ListView,
    Alert
} from 'react-native';

import _ from 'lodash';

import Rx from 'rxjs';

import mobx, {
    observable,
    computed,
    autorun,
    action,
    useStrict
} from 'mobx';

import moment from 'moment';

import * as Poloniex from '../../../api/poloniex';

import Clock from '../../../utils/clock.js';

export default class MySentimentUiStore {
    
    /**
     * Domain store.
     */
    domainStore: any;

    constructor(domainStore: any) {
        useStrict(true);

        this.domainStore = domainStore;
    }

    /**
     * Periods for displaying on the list.
     */
    @observable periods: number[] = [
        Poloniex.candlestickPeriods.twoHours,
        Poloniex.candlestickPeriods.fourHours,
        Poloniex.candlestickPeriods.oneDay
    ];

    /**
     * Index of selected candlestick period.
     */
    @observable indexOfSelectedPeriod: number = 2;

    /**
     * Updates index of selected candlestick period.
     */
    @action setIndexOfSelectedPeriod = (index: number): void => {
        this.indexOfSelectedPeriod = index;
    };

    /**
     * Shows whether data is loading now.
     */
    @observable isLoading: boolean = false;

    /**
     * Updates `isLoading` flag.
     */
    @action setIsLoading = (value: boolean): void => {
        this.isLoading = value;
    };

    @computed get ticker(): Object {
        const findTicker = (arr) => _.find(arr, t => _.isEqual(t.symbol, this.domainStore.selectedSymbol));
        const formatTicker = (t) => { return {
            symbol: t.symbol,
            displaySymbol: _.replace(t.symbol, "_", "/"),
            dailyChangePercent: t.dailyChangePercent.toFixed(2),
            price: (() => {
                const p = t.price.toPrecision(6);
                if (_.includes(p, "e") || p.length > 10) {
                    return t.price.toFixed(8);
                }
                return p;
            })(),
            volume: t.volume,
        }};

        const getTicker = _.flow(findTicker, formatTicker);

        return getTicker(this.domainStore.tickers);
    }

    @computed get sentimentsForCurrentSymbol(): Object[] {
        return _.filter(
            this.domainStore.sentiments.slice(),
            s => { return _.isEqual(s.asset, this.domainStore.selectedSymbol) }
        );
    }

    @computed get chartData_oldImplementation(): Object[] {
        /**
         * Start to measure time interval.
         */
        const clock = new Clock();
        clock.start();

        /**
         * Obtain candles.
         */
        const formattedPeriod = Poloniex.periodToString(
            this.periods[this.indexOfSelectedPeriod]
        );

        const timeseries = _.get(
            this.domainStore.history,
            [
                `${this.ticker.symbol}`,
                `${formattedPeriod}`
            ],
            []
        );

        const sentimentsForCurrentSymbol = _.filter(
            this.domainStore.sentiments.slice(),
            s => { return _.isEqual(s.asset, this.domainStore.selectedSymbol) }
        );
        
        const candles = _.map(
            timeseries,
            t => {
                // const date = moment.unix(t.date);
                const candleTimestamp = new Date(t.timestamp * 1000).setHours(0, 0, 0, 0);


                const sentimentObject = _.find(sentimentsForCurrentSymbol, s => {
                    const sentimentTimestamp = new Date(s.timestamp * 1000).setHours(0, 0, 0, 0);

                    return candleTimestamp === sentimentTimestamp;
                });
                return {
                    timestamp: candleTimestamp,
                    candle: _.pick(t, ['open', 'high', 'low', 'close']),
                    sentiment: _.get(sentimentObject, 'sentiment'),
                }
            }
        );

        /**
         * Stop to measure time interval.
         */
        const algorithmTimeInterval = clock.stop();
        
        console.log(
            "sentiment-to-candle algorithm has finished in ",
            algorithmTimeInterval,
            " milliseconds"
        );

        /**
         * Return candles.
         */
        return candles;
    }

    @computed get chartData(): Object[] {
        /**
         * Start to measure time interval.
         */
        const clock = new Clock();
        clock.start();

        /**
         * Obtain candles.
         */
        const selectedPeriod = this.periods[this.indexOfSelectedPeriod];

        const formattedPeriod = Poloniex.periodToString(
            selectedPeriod
        );

        const timeseries = _.get(
            this.domainStore.history,
            [
                `${this.ticker.symbol}`,
                `${formattedPeriod}`
            ],
            []
        );

        const sentimentsForCurrentSymbolHashMap = {};
        
        this.domainStore.sentiments.forEach(
            s => {
                if (_.isEqual(s.asset, this.domainStore.selectedSymbol)) {
                    console.log("Source timestamp: ", new Date(s.timestamp * 1000));
                    const correctedSentimentTimestampInSeconds = s.timestamp - (s.timestamp % selectedPeriod);
                    console.log("Corrected timestamp: ", new Date(correctedSentimentTimestampInSeconds * 1000));
                    const correctedSentimentTimestampInMilliseconds = correctedSentimentTimestampInSeconds * 1000;
                    
                    sentimentsForCurrentSymbolHashMap[correctedSentimentTimestampInMilliseconds] = s;
                }
            }
        );

        const candles = _.map(
            timeseries,
            t => {
                const correctedCandleTimestampInSeconds = t.timestamp - (t.timestamp % selectedPeriod);
                const correctedCandleTimestampInMilliseconds = correctedCandleTimestampInSeconds * 1000;

                const sentimentObject = sentimentsForCurrentSymbolHashMap[correctedCandleTimestampInMilliseconds];

                return {
                    timestamp: correctedCandleTimestampInMilliseconds,
                    candle: _.pick(t, ['open', 'high', 'low', 'close']),
                    sentiment: _.get(sentimentObject, 'sentiment'),
                }
            }
        );

        /**
         * Stop to measure time interval.
         */
        const algorithmTimeInterval = clock.stop();
        
        console.log(
            "sentiment-to-candle algorithm has finished in ",
            algorithmTimeInterval,
            " milliseconds"
        );

        /**
         * Return candles.
         */
        return candles;
    }

    @computed get rows(): Object[] {
        const sortByDate = (arr) => _.orderBy(arr, ['date'], ['desc']);
        const formatDates = (arr) => _.map(arr, s => { return {...s, date: moment.unix(s.timestamp).fromNow()}});
        const formatPrice = (arr) => _.map(arr, s => { return {
            ...s,
            price: _.isEmpty(s.price) ? "" : s.price
        }});

        return _.flow(sortByDate, formatDates, formatPrice)(this.sentimentsForCurrentSymbol.slice());
    }

    _dataSource = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

    @computed get dataSource(): Object {
        return this._dataSource.cloneWithRows(this.rows.slice());
    }

    @action refresh = (): void => {
        const selectedCandlestickPeriod = this.periods[this.indexOfSelectedPeriod];

        Rx.Observable
            .forkJoin(
                this.domainStore.refreshSentiments(
                    this.domainStore.user.id
                ),
                this.domainStore.refreshHistory(
                    this.domainStore.symbols,
                    selectedCandlestickPeriod
                ),
                this.domainStore.refreshTickers()
            )
            .subscribe(
                () => { },
                error => Alert.alert(
                    'Refresh Error',
                    error.toString(),
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                            }
                        }
                    ]
                )
            );
    };

    @computed get dropdownOptions(): String[] {
        return this.periods.map(Poloniex.periodToString);
    }

    @computed get dropdownDefaultValue(): String {
        /**
         * Obtain selected period by index.
         */
        const selectedPeriod = this.periods[this.indexOfSelectedPeriod];
        
        /**
         * Return string containing formatted period.
         */
        return Poloniex.periodToString(
            selectedPeriod
        );
    }

    @computed get dropdownDefaultIndex(): Number {
        return this.indexOfSelectedPeriod;
    }
}
