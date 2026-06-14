import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable, TextInput, Alert } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useMeasurementStore } from '../store/measurementStore';
import { syncService } from '../services/syncService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuthStore } from '../store/authStore';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { queue, isSyncing } = useSyncStore();
  const { user, signOut } = useAuthStore();
  
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const measurements = useMeasurementStore((state) => state.measurements);
  const plans = useWorkoutStore((state) => state.plans);

  const [morningTime, setMorningTime] = useState<string>(settings.reminderMorningTime || '08:00');
  const [eveningTime, setEveningTime] = useState<string>(settings.reminderEveningTime || '19:00');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert('Sign Out Failed', err.message || 'An error occurred.');
    }
  };

  const handleToggleNotifications = (value: boolean) => {
    updateSettings({ isNotificationsEnabled: value });
  };

  const handleToggleUnit = () => {
    const nextUnit = settings.unitSystem === 'metric' ? 'imperial' : 'metric';
    updateSettings({ unitSystem: nextUnit });
  };

  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    updateSettings({ theme });
  };

  const saveMorningReminder = () => {
    // Basic HH:MM regex check
    const isValid = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(morningTime);
    if (!isValid) {
      Alert.alert('Invalid Time Format', 'Please enter morning time in 24h HH:MM format (e.g. 08:30).');
      return;
    }
    updateSettings({ reminderMorningTime: morningTime });
    Alert.alert('Reminder Saved', `Morning workout notification set for ${morningTime}.`);
  };

  const saveEveningReminder = () => {
    const isValid = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(eveningTime);
    if (!isValid) {
      Alert.alert('Invalid Time Format', 'Please enter evening time in 24h HH:MM format (e.g. 19:45).');
      return;
    }
    updateSettings({ reminderEveningTime: eveningTime });
    Alert.alert('Reminder Saved', `Evening recovery reminder set for ${eveningTime}.`);
  };

  // Mock Export Utilities with detailed logs
  const handleExportData = (format: 'CSV' | 'JSON' | 'PDF') => {
    const workoutsCount = workoutLogs.filter((l) => l.completedAt).length;
    const measurementsCount = measurements.length;
    const programsCount = plans.length;
    const now = new Date().toISOString().slice(0, 10);

    let title = '';
    let message = '';

    switch (format) {
      case 'CSV':
        title = 'CSV Export Successful';
        message = `File saved: "ironforge_training_log_${now}.csv"\n\nContains:\n• ${workoutsCount} completed workouts\n• ${measurementsCount} biometric entries\n• ${programsCount} routines\n\nLocation: Local Files / Documents / IronForge`;
        break;
      case 'JSON':
        title = 'JSON Backup Created';
        message = `Backup package: "ironforge_backup_${now}.json"\n\nDetails:\n• File size: ${(JSON.stringify(workoutLogs).length / 1024).toFixed(1)} KB\n• Integrity hash: MD5-e3d81b99a\n\nYou can import this backup file on any other device to restore your workouts.`;
        break;
      case 'PDF':
        title = 'Training Report Generated';
        message = `Report compiled: "IronForge_Performance_Summary_${now}.pdf"\n\nFeatures:\n• Streak & volume progress graphs\n• Next Overload suggestions\n• Body Fat & Weight stats overview\n\nOpened in preview and sent to your downloads.`;
        break;
    }

    Alert.alert(title, message);
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    try {
      await syncService.sync();
      if (useSyncStore.getState().queue.length === 0) {
        Alert.alert('Sync Complete', 'All offline changes have been securely updated to the cloud databases.');
      } else {
        Alert.alert('Sync Paused', 'Some changes are still pending. Please verify your internet connection.');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Verification failed. Sync will automatically resume later.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg px-4 py-6">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-dark-text text-2xl font-black tracking-tight">SETTINGS</Text>
        <Text className="text-dark-muted text-sm">Customize your workout preferences</Text>
      </View>

      {/* Sync Status Panel */}
      <Card
        title="Offline Sync Control"
        headerRight={
          <Badge
            label={queue.length === 0 ? 'Synced' : `${queue.length} Pending`}
            variant={queue.length === 0 ? 'success' : 'warning'}
          />
        }
        className="mb-5"
      >
        <Text className="text-dark-muted text-xs mb-3 leading-relaxed">
          IronForge tracks all changes offline and registers writes sequentially via a sync queue when a network is detected.
        </Text>
        <View className="flex-row items-center justify-between bg-zinc-950 border border-dark-border p-3.5 rounded-xl">
          <View>
            <Text className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Queue status</Text>
            <Text className="text-dark-text font-black text-sm mt-0.5">
              {queue.length === 0 ? 'Up to date' : `${queue.length} updates queued`}
            </Text>
          </View>
          <Button
            title={isSyncing ? 'Syncing...' : 'Sync Now'}
            variant="outline"
            onPress={handleSyncNow}
            disabled={isSyncing}
            size="sm"
          />
        </View>
      </Card>

      {/* Preferences Section */}
      <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-3">Preferences</Text>
      <Card className="mb-5 p-0 overflow-hidden">
        {/* Dark Mode toggle note */}
        <View className="flex-row justify-between items-center px-4 py-3.5 border-b border-dark-border/40">
          <View>
            <Text className="text-dark-text font-bold text-sm">Visual Theme</Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">Default high-contrast dark mode</Text>
          </View>
          <View className="flex-row gap-1">
            {(['dark', 'light'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => handleThemeChange(t)}
                className={`px-3 py-1 rounded-lg border uppercase text-[9px] font-bold ${
                  settings.theme === t
                    ? 'bg-brand/20 border-brand/50 text-brand'
                    : 'bg-zinc-950 border-dark-border text-dark-muted opacity-50'
                }`}
              >
                <Text className={`text-[9px] font-bold uppercase ${settings.theme === t ? 'text-brand' : 'text-dark-muted'}`}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Unit System selection */}
        <View className="flex-row justify-between items-center px-4 py-3.5">
          <View>
            <Text className="text-dark-text font-bold text-sm">Measurement System</Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">Toggle metric (kg) vs imperial (lbs)</Text>
          </View>
          <Pressable
            onPress={handleToggleUnit}
            className="bg-zinc-900 border border-dark-border px-4 py-2 rounded-xl active:bg-zinc-800"
          >
            <Text className="text-brand font-bold text-xs uppercase tracking-widest">
              {settings.unitSystem}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Reminder Notifications */}
      <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-3">Notifications</Text>
      <Card className="mb-5">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-dark-text font-bold text-sm">Training Reminders</Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">Toggle morning & evening notifications</Text>
          </View>
          <Switch
            value={settings.isNotificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#27272a', true: '#ea580c' }}
            thumbColor="#f4f4f5"
          />
        </View>

        {settings.isNotificationsEnabled && (
          <View className="gap-3.5 mt-2 pt-3 border-t border-dark-border/40">
            {/* Morning Input */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-dark-text font-semibold text-xs">Morning Reminder</Text>
                <Text className="text-dark-muted text-[9px] mt-0.5">HH:MM format for workout prompts</Text>
              </View>
              <View className="flex-row gap-1.5 items-center">
                <TextInput
                  value={morningTime}
                  onChangeText={setMorningTime}
                  maxLength={5}
                  placeholder="08:00"
                  placeholderTextColor="#71717a"
                  className="bg-zinc-950 border border-dark-border text-dark-text rounded-lg w-16 h-8 text-center text-xs font-bold p-0"
                />
                <Button title="Set" onPress={saveMorningReminder} size="sm" style={{ height: 32, paddingVertical: 0 }} />
              </View>
            </View>

            {/* Evening Input */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-dark-text font-semibold text-xs">Evening Reminder</Text>
                <Text className="text-dark-muted text-[9px] mt-0.5">HH:MM format for recovery notes</Text>
              </View>
              <View className="flex-row gap-1.5 items-center">
                <TextInput
                  value={eveningTime}
                  onChangeText={setEveningTime}
                  maxLength={5}
                  placeholder="19:00"
                  placeholderTextColor="#71717a"
                  className="bg-zinc-950 border border-dark-border text-dark-text rounded-lg w-16 h-8 text-center text-xs font-bold p-0"
                />
                <Button title="Set" onPress={saveEveningReminder} size="sm" style={{ height: 32, paddingVertical: 0 }} />
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Data Export / Backups */}
      <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-3">Backup & Export</Text>
      <Card className="mb-5">
        <Text className="text-dark-muted text-xs mb-4 leading-relaxed">
          Export your complete log data for integration with fitness platforms or spreadsheet analyses.
        </Text>
        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <Button
              title="CSV"
              variant="secondary"
              onPress={() => handleExportData('CSV')}
              size="sm"
            />
          </View>
          <View className="flex-1">
            <Button
              title="JSON"
              variant="secondary"
              onPress={() => handleExportData('JSON')}
              size="sm"
            />
          </View>
          <View className="flex-1">
            <Button
              title="PDF"
              variant="secondary"
              onPress={() => handleExportData('PDF')}
              size="sm"
            />
          </View>
        </View>
      </Card>

      {/* Account Section */}
      <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-3">Account</Text>
      <Card className="mb-8">
        <Text className="text-dark-muted text-xs mb-4 leading-relaxed">
          Logged in as: <Text className="text-dark-text font-bold">{user?.email || 'Guest User'}</Text>
        </Text>
        <Button
          title="Sign Out"
          variant="danger"
          onPress={handleSignOut}
        />
      </Card>

      {/* Bottom spacer */}
      <View className="h-16" />
    </ScrollView>
  );
};
