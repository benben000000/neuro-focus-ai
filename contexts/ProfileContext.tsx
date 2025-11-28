import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, createUserProfile, UserProfile, subscribeToUserProfile } from '../services/social';

interface ProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = async () => {
        if (!currentUser) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            let userProfile = await getUserProfile(currentUser.uid);
            
            if (!userProfile) {
                userProfile = await createUserProfile(currentUser);
            }

            setProfile(userProfile);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser) {
            setProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        loadProfile();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToUserProfile(currentUser.uid, (updatedProfile) => {
            setProfile(updatedProfile);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser?.uid]);

    const refreshProfile = async () => {
        if (currentUser) {
            const userProfile = await getUserProfile(currentUser.uid);
            setProfile(userProfile);
        }
    };

    const value = {
        profile,
        loading,
        refreshProfile
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
}
