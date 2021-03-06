/**
 * @flow
 */

import {
    StyleSheet,
} from 'react-native';

import Palette from '../../../resources/colors';

const getStyles = (): StyleSheet => (
    StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            borderBottomColor: Palette.silver,
            borderBottomWidth: StyleSheet.hairlineWidth,
            height: 50,
        },
        text: {
            flex: 1,
            marginLeft: 10,
            marginRight: 10,
        },
    })
);

export default getStyles;
