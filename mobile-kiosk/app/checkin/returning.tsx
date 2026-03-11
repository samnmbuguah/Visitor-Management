import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { ArrowLeft, Search, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { searchVisitor } from '../../src/api/visitors';

export default function ReturningVisitorScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim() || query.trim().length < 3) {
            Alert.alert('Error', 'Please enter at least 3 characters to search');
            return;
        }

        setLoading(true);
        try {
            const data = await searchVisitor(query);
            const searchResults = data.results || data;
            setResults(searchResults);
            if (searchResults.length === 0) {
                Alert.alert('Not Found', 'No returning visitor found with that information. Please register as a new visitor.');
            }
        } catch (error) {
            console.error('Search failed:', error);
            Alert.alert('Error', 'Search failed. Please try again or register as a new visitor.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVisitor = (visitor: any) => {
        router.push({
            pathname: '/checkin/form',
            params: {
                name: visitor.name,
                email: visitor.email,
                phone: visitor.phone,
                company: visitor.company
            }
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Returning Visitor</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.subtitle}>Enter your email, phone, or name</Text>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Search..."
                        placeholderTextColor="#64748b"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Search color="#fff" size={20} />
                        )}
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={results}
                    keyExtractor={(_, index) => index.toString()}
                    style={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.resultCard}
                            onPress={() => handleSelectVisitor(item)}
                        >
                            <View style={styles.resultIcon}>
                                <User color="#6366f1" size={24} />
                            </View>
                            <View style={styles.resultInfo}>
                                <Text style={styles.resultName}>{item.name}</Text>
                                {(item.email || item.phone) && (
                                    <Text style={styles.resultDetails}>
                                        {item.email} {item.email && item.phone ? '•' : ''} {item.phone}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 16,
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 30,
    },
    input: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#fff',
        height: 56,
    },
    searchButton: {
        backgroundColor: '#6366f1',
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        flex: 1,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    resultIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#6366f120',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    resultDetails: {
        color: '#94a3b8',
        fontSize: 14,
    },
});
