import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

export default function GuidesLayout() {
    const navigation = useNavigation();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: COLORS.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontFamily: 'Inter_600SemiBold',
                },
                headerBackTitleVisible: false,
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => navigation.openDrawer()}
                        style={styles.headerButton}
                    >
                        <Feather name="menu" size={24} color="white" />
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Legal Guides',
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Guide Details',
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.headerButton}
                        >
                            <Feather name="arrow-left" size={24} color="white" />
                        </TouchableOpacity>
                    ),
                }}
            />
        </Stack>
    );
}

const styles = StyleSheet.create({
    headerButton: {
        marginLeft: 16,
    },
});
