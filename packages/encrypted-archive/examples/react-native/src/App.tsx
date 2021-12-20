import { multiply } from '@sounisi5011/encrypted-archive/dist/index.react-native';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App(): JSX.Element {
    const [result, setResult] = React.useState<number | undefined>();
    const [error, setError] = React.useState<unknown>();

    React.useEffect(() => {
        multiply(3, 7)
            .then(setResult)
            .catch(setError);
    }, []);

    return (
        <View style={styles.container}>
            {error
                ? <Text>{String(error)}</Text>
                : result !== undefined
                ? <Text>Result: {result}</Text>
                : <Text>Calculating...</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    box: {
        width: 60,
        height: 60,
        marginVertical: 20,
    },
});
