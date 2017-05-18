/**
 * Created by workplace on 23/03/2017.
 * @flow
 */

'use strict';

import _ from 'lodash'
import Rx from 'rxjs'
import moment from 'moment'

import ReactNative from 'react-native';
const {AsyncStorage, Alert} = ReactNative;

import mobx, {observable, computed, autorun, action, useStrict} from 'mobx'
import {create, persist} from 'mobx-persist'

import * as Bitfinex from '../../api/bitfinex'
import * as Poloniex from '../../api/poloniex'

import * as Santiment from '../../api/santiment'

import type {SentimentType} from './types'

import DeviceInfo from 'react-native-device-info';

class DomainStore {
    constructor() {
        useStrict(true);
    }

    /**
     * User
     *
     */

    @persist('object')
    @observable
    user: Object = {
        id: DeviceInfo.getUniqueID()
    };

    /**
     * Symbols
     *
     */

    @persist('list')
    @observable symbols: string[] = [
        "BTC_USDT",
        "ETH_USDT"
    ];

    @action setSymbols = (symbols: string[]): void => {
        this.symbols = symbols;
        console.log("Symbols updated:\n", symbols);
    };

    @action addSymbol = (symbol: string): void => {
        this.setSymbols(_.union(this.symbols, [symbol]));
    };

    @action removeSymbol = (symbol: string): void => {
        this.setSymbols(_.without(this.symbols, symbol));
    };

    /**
     * Selected symbol
     *
     * string
     */

    @observable selectedSymbol: string = "";

    @action setSelectedSymbol = (symbol: string): void => {
        this.selectedSymbol = symbol;
        console.log("Symbol selected:\n", symbol);
    };

    /**
     * Tickers
     *
     * [{ symbol: "BTC_USD", price: 1050, dailyChangePercent: 6.34, volume: 500 }, ...]
     */

    @persist('list')
    @observable tickers: Object[] = [];

    @action setTickers = (tickers: Object[]): void => {
        this.tickers = tickers;
        console.log("Tickers updated:\n", tickers);
    };

    /**
     * History
     *
     * {
     *     "BTC_USD": {
     *         "1H": [
     *             { timestamp: "1490263200000", open: 1029.4, high: 1034.4, low: 1025.1, close: 1027.4, volume: 500 }
     *         ],
     *         "4H": [
     *             { timestamp: "1490263200000", open: 1029.4, high: 1034.4, low: 1025.1, close: 1027.4, volume: 500 }
     *         ],
     *     }
     * }
     *
     */

    @persist('object')
    @observable history: Object = {};

    @action setHistory = (history: Object): void => {
        this.history = history;
        console.log("History updated:\n", history);
    };

    @action fetchHistory = (symbol: string, timeframe: number): Rx.Observable<Object> => {
        const reversePair = (s) => _.join(_.reverse(_.split(s, "_")), "_");

        return Poloniex.getCandles(reversePair(symbol), moment().subtract(180, 'days').toDate(), moment().toDate(), timeframe)
            .map(items => {
                const candles = items.map(i => {
                    return {
                        timestamp: i.date,
                        ..._.pick(i, ['open', 'close', 'high', 'low'])
                    }
                });

                let obj = {};
                _.set(obj, [symbol, period], _.orderBy(candles, ['timestamp'], ['asc']));

                return obj;
            })
    };

    @action fetchHistory = (): Rx.Observable<Object> => {
        const observables$ = this.symbols.map((symbol) => {
            return Poloniex.getCandles(
                symbol,
                moment().subtract(180, 'days').toDate(),
                moment().toDate(),
                Poloniex.candlestickPeriods.oneDay
            );
        });

        // $FlowFixMe
        return Rx.Observable.forkJoin(observables$)
            .map(arr => _.assign(...arr));
    };

    /**
     * Sentiment
     *
     * [{
     *     user: "id",
     *     data: [
     *         {"id": "aaa", "symbol": "BTC_USD", "sentiment": "bullish", "price": 1041, "timestamp": "1318874398"},
     *     ]
     * }]
     */

    @persist('list')
    @observable sentiments: SentimentType[] = [];

    @action setSentiment = (sentiments: SentimentType[]): void => {
        this.sentiments = sentiments;
        console.log("Sentiments updated:\n", sentiments);
    };

    @action addSentiment = (sentiment: SentimentType): Rx.Observable<Object> => {
        const userSentiment = _.assign(sentiment, {userId: this.user.id});
        const newSentiments = _.concat([], userSentiment, this.sentiments.slice());

        this.setSentiment(newSentiments);

        return Santiment.postSentiment(userSentiment)
            .do(() => console.log("POST /sentiment succeeded"));
    };

    @action fetchSentiment = (): Rx.Observable<SentimentType[]> => {
        return Santiment.getSentiments(this.user.id);
    };

    /**
     * Aggregate sentiment
     *   {
     *       "BTC_USD": [
     *           {"bullish": 1, "bearish": 2, "catish": 0 , "date": "2017-03-16T23:23:41.229Z"},
     *           {"bullish": 1, "bearish": 2, "catish": 0 , "date": "2017-03-16T23:23:41.229Z"}
     *       ],
     *       "ETH_USD": [
     *           {"bullish": 1, "bearish": 2, "catish": 0 , "date": "2017-03-16T23:23:41.229Z"},
     *           {"bullish": 1, "bearish": 2, "catish": 0 , "date": "2017-03-16T23:23:41.229Z"}
     *       ],
     *   }
     */

    @persist('object')
    @observable aggregates: Object = {};

    @action setAggregates = (aggregates: Object): void => {
        this.aggregates = aggregates;
        console.log("Aggregates updated:\n", aggregates);
    };

    @action fetchAggregates = (): Rx.Observable<Object> => {
        const observables$ = this.symbols.map((symbol) => {

            return Santiment.getAggregate(symbol)
                .map(items => {
                    let obj = {};
                    _.set(obj, [symbol], items);

                    return obj;
                })
        });

        // $FlowFixMe
        return Rx.Observable.forkJoin(observables$)
            .map(arr => _.assign(...arr))
    };

    /**
     * Feeds
     *   {
     *       "BTC": [
     *           {
     *             "timestamp": 1494520384,
     *             "username": "UName",
     *             "message": "Can do you help me... Ticket #123 BTC Awaiting Approval",
     *             "source": "trollbox"
     *           },
     *       ],
     *   }
     */

    @persist('object')
    @observable feeds: Object = {};

    @action setFeeds = (feeds: Object): void => {
        this.feeds = feeds;
        console.log("Feeds updated:\n", feeds);
    };

    @action fetchFeeds = (): Rx.Observable<Object> => {
        const observables$ = this.symbols.map((symbol) => {

            const asset = _.split(symbol, "_")[0];

            return Santiment.getFeed(asset)
                .map(items => {
                    let obj = {};
                    _.set(obj, [asset], items);

                    return obj;
                })
        });

        // $FlowFixMe
        return Rx.Observable.forkJoin(observables$)
            .map(arr => _.assign(...arr))
    };

    /**
     * Refresh
     */

    @action refresh = (): Rx.Observable<any> => {
        console.log("domainStore.refresh() called");
        console.log("user =", JSON.stringify(domainStore.user, null, 2));
        console.log("symbols =", JSON.stringify(domainStore.symbols.slice(), null, 2));

        return Rx.Observable
            .forkJoin(
                Poloniex.getTickers(),
                this.fetchHistory(),
                this.fetchSentiment(),
                this.fetchAggregates(),
                this.fetchFeeds(),
            )
            .do(
                ([tickers, history, sentiment, aggregates, feeds]) => {
                    this.setTickers(tickers);
                    this.setHistory(history);
                    this.setSentiment(sentiment);
                    this.setAggregates(aggregates);
                    this.setFeeds(feeds);
                },
                console.log
            )
            .do(() => console.log('domainStore refreshed'), console.log)
    }

    /**
     * Updates tickers in local storage.
     * 
     * @return Observable.
     */
    @action refreshTickers = (): Rx.Observable<any> => {
        /**
         * Console output.
         */
        
        console.log("domainStore.refreshTickers() called");

        /**
         * Return observable.
         */
        return Poloniex.getTickers()
            .do(
                ([tickers]) => {
                    this.setTickers(tickers);
                },
                console.log
            )
            .do(() => console.log('Tickers refreshed'), console.log);
    };

    /**
     * Updates history in local storage.
     * 
     * @param {*} symbols Collection of currency pairs.
     * @param {number} candlestickPeriod Candlestick period in seconds.
     * @return Observable.
     */
    @action refreshHistory = (symbols: any, candlestickPeriod: number): Rx.Observable<any> => {
        /**
         * Console output.
         */
        
        console.log("domainStore.refreshHistory() called");

        /**
         * Default values.
         */
        const defaultStartDate = moment().subtract(180, 'days').toDate();
        const defaultEndDate = moment().toDate();

        /**
         * Start updating candles for each symbol.
         */
        const observables = symbols.map((symbol) => {
            return Poloniex.getCandles(
                symbol,
                defaultStartDate,
                defaultEndDate,
                Poloniex.candlestickPeriods.oneDay
            );
        });

        /**
         * Return observables.
         */
        return Rx.Observable.forkJoin(observables)
            .map(arr => _.assign(...arr))
            .do(
                ([history]) => {
                    this.setHistory(history);
                },
                console.log
            )
            .do(() => console.log('Candles refreshed'), console.log);
    };
}

const hydrate = create({storage: AsyncStorage});

const domainStore = new DomainStore();
export default domainStore;

Rx.Observable.fromPromise(hydrate('store', domainStore))
    .do(() => console.log('domainStore hydrated'))
    .flatMap(() => domainStore.refresh())
    .subscribe(
        () => {},
        error => Alert.alert(
            'Refresh Error',
            error.toString(),
            [
                {text: 'OK', onPress: () => {}},
            ]
        ),
    );
