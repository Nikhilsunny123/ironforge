import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Image, Alert } from 'react-native';
import { useMeasurementStore } from '../store/measurementStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const MeasurementsScreen: React.FC = () => {
  const measurements = useMeasurementStore((state) => state.measurements);
  const photos = useMeasurementStore((state) => state.photos);
  
  const addMeasurement = useMeasurementStore((state) => state.addMeasurement);
  const deleteMeasurement = useMeasurementStore((state) => state.deleteMeasurement);
  const addPhoto = useMeasurementStore((state) => state.addPhoto);
  const deletePhoto = useMeasurementStore((state) => state.deletePhoto);

  const [activeTab, setActiveTab] = useState<'stats' | 'photos'>('stats');
  
  // Measurement Logging State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [formWeight, setFormWeight] = useState<string>('');
  const [formNeck, setFormNeck] = useState<string>('');
  const [formChest, setFormChest] = useState<string>('');
  const [formWaist, setFormWaist] = useState<string>('');
  const [formBicepLeft, setFormBicepLeft] = useState<string>('');
  const [formBicepRight, setFormBicepRight] = useState<string>('');
  const [formForearmLeft, setFormForearmLeft] = useState<string>('');
  const [formForearmRight, setFormForearmRight] = useState<string>('');
  const [formThighLeft, setFormThighLeft] = useState<string>('');
  const [formThighRight, setFormThighRight] = useState<string>('');

  // Progress Photo Upload Simulation State
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [photoType, setPhotoType] = useState<'front' | 'side' | 'back'>('front');
  
  // Comparison State
  const [beforePhotoId, setBeforePhotoId] = useState<string>('');
  const [afterPhotoId, setAfterPhotoId] = useState<string>('');

  const handleSaveMeasurement = () => {
    if (!formWeight) {
      Alert.alert('Validation Error', 'Weight is required to submit a log.');
      return;
    }

    addMeasurement({
      userId: 'default-user',
      weight: parseFloat(formWeight) || undefined,
      neck: parseFloat(formNeck) || undefined,
      chest: parseFloat(formChest) || undefined,
      waist: parseFloat(formWaist) || undefined,
      bicepLeft: parseFloat(formBicepLeft) || undefined,
      bicepRight: parseFloat(formBicepRight) || undefined,
      forearmLeft: parseFloat(formForearmLeft) || undefined,
      forearmRight: parseFloat(formForearmRight) || undefined,
      thighLeft: parseFloat(formThighLeft) || undefined,
      thighRight: parseFloat(formThighRight) || undefined,
      measuredAt: new Date().toISOString(),
    });

    // Clear fields & close modal
    setFormWeight('');
    setFormNeck('');
    setFormChest('');
    setFormWaist('');
    setFormBicepLeft('');
    setFormBicepRight('');
    setFormForearmLeft('');
    setFormForearmRight('');
    setFormThighLeft('');
    setFormThighRight('');
    setShowLogModal(false);
  };

  // Mock progress photos since expo-image-picker is not installed
  // We provide realistic high-quality training placeholders
  const samplePhotos = {
    front: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=80',
    side: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    back: 'https://images.unsplash.com/photo-1605296867304-46d5465a25f1?w=600&auto=format&fit=crop&q=80',
  };

  const handleAddPhotoMock = () => {
    addPhoto({
      userId: 'default-user',
      photoUrl: samplePhotos[photoType],
      photoType,
      takenAt: new Date().toISOString(),
    });
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = (id: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this progress photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(id) },
    ]);
  };

  const beforePhoto = photos.find((p) => p.id === beforePhotoId);
  const afterPhoto = photos.find((p) => p.id === afterPhotoId);

  return (
    <ScrollView className="flex-1 bg-dark-bg px-4 py-6">
      {/* Header */}
      <View className="mb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-dark-text text-2xl font-black tracking-tight">MEASUREMENTS</Text>
          <Text className="text-dark-muted text-sm">Track physical transformation</Text>
        </View>
        <Button
          title={activeTab === 'stats' ? '+ Log Stats' : '+ Add Photo'}
          onPress={() => (activeTab === 'stats' ? setShowLogModal(true) : setShowPhotoModal(true))}
          size="sm"
        />
      </View>

      {/* Tab bar */}
      <View className="flex-row bg-zinc-900/60 p-1.5 border border-dark-border rounded-2xl mb-6">
        <Pressable
          onPress={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl ${
            activeTab === 'stats' ? 'bg-zinc-800' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-center text-xs font-bold ${
              activeTab === 'stats' ? 'text-brand' : 'text-dark-muted'
            }`}
          >
            BODY STATS
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('photos')}
          className={`flex-1 py-2.5 rounded-xl ${
            activeTab === 'photos' ? 'bg-zinc-800' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-center text-xs font-bold ${
              activeTab === 'photos' ? 'text-brand' : 'text-dark-muted'
            }`}
          >
            PROGRESS PHOTOS
          </Text>
        </Pressable>
      </View>

      {/* 1. BODY STATS TAB */}
      {activeTab === 'stats' && (
        <View>
          {measurements.length === 0 ? (
            <Card className="items-center py-12">
              <Text className="text-4xl mb-3">📏</Text>
              <Text className="text-dark-text font-bold text-base mb-1">No measurements logged yet</Text>
              <Text className="text-dark-muted text-xs text-center mb-6 max-w-[280px]">
                Consistently log your weight and body measurements to track fat loss and hypertrophy progress.
              </Text>
              <Button title="Log First Entry" onPress={() => setShowLogModal(true)} size="md" />
            </Card>
          ) : (
            <View>
              {/* Latest Stats Highlight Card */}
              <Card title="Latest Body Stats" className="border-l-4 border-l-brand mb-5">
                {(() => {
                  const latest = measurements[0];
                  return (
                    <View className="flex-row flex-wrap gap-y-4 pt-1">
                      {[
                        { label: 'Weight', value: latest.weight, unit: 'kg' },
                        { label: 'Neck', value: latest.neck, unit: 'cm' },
                        { label: 'Chest', value: latest.chest, unit: 'cm' },
                        { label: 'Waist', value: latest.waist, unit: 'cm' },
                        { label: 'Left Arm', value: latest.bicepLeft, unit: 'cm' },
                        { label: 'Right Arm', value: latest.bicepRight, unit: 'cm' },
                        { label: 'Left Forearm', value: latest.forearmLeft, unit: 'cm' },
                        { label: 'Right Forearm', value: latest.forearmRight, unit: 'cm' },
                        { label: 'Left Thigh', value: latest.thighLeft, unit: 'cm' },
                        { label: 'Right Thigh', value: latest.thighRight, unit: 'cm' },
                      ].map((item, idx) => (
                        <View key={idx} className="w-[33%]">
                          <Text className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">
                            {item.label}
                          </Text>
                          <Text className="text-dark-text font-extrabold text-sm mt-0.5">
                            {item.value ? `${item.value} ${item.unit}` : '--'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </Card>

              {/* Stats Log History List */}
              <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-3">Measurement History</Text>
              <View className="gap-3">
                {measurements.map((item) => (
                  <Card
                    key={item.id}
                    title={new Date(item.measuredAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    headerRight={
                      <Pressable
                        onPress={() => {
                          Alert.alert('Delete Entry', 'Delete this measurement entry?', [
                            { text: 'Cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteMeasurement(item.id),
                            },
                          ]);
                        }}
                        className="px-2.5 py-1 bg-red-950/20 border border-red-500/20 rounded-lg"
                      >
                        <Text className="text-red-400 text-[10px] font-bold">DELETE</Text>
                      </Pressable>
                    }
                  >
                    <View className="flex-row flex-wrap gap-y-3 pt-1">
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">Weight</Text>
                        <Text className="text-dark-text font-bold text-xs">{item.weight ? `${item.weight} kg` : '--'}</Text>
                      </View>
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">Chest</Text>
                        <Text className="text-dark-text font-bold text-xs">{item.chest ? `${item.chest} cm` : '--'}</Text>
                      </View>
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">Waist</Text>
                        <Text className="text-dark-text font-bold text-xs">{item.waist ? `${item.waist} cm` : '--'}</Text>
                      </View>
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">Neck</Text>
                        <Text className="text-dark-text font-bold text-xs">{item.neck ? `${item.neck} cm` : '--'}</Text>
                      </View>
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">L/R Arm</Text>
                        <Text className="text-dark-text font-bold text-xs">
                          {item.bicepLeft || '--'} / {item.bicepRight || '--'} cm
                        </Text>
                      </View>
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">L/R Forearm</Text>
                        <Text className="text-dark-text font-bold text-xs">
                          {item.forearmLeft || '--'} / {item.forearmRight || '--'} cm
                        </Text>
                      </View>
                      <View className="w-[25%]">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">L/R Thigh</Text>
                        <Text className="text-dark-text font-bold text-xs">
                          {item.thighLeft || '--'} / {item.thighRight || '--'} cm
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 2. PROGRESS PHOTOS TAB */}
      {activeTab === 'photos' && (
        <View>
          {photos.length === 0 ? (
            <Card className="items-center py-12">
              <Text className="text-4xl mb-3">📸</Text>
              <Text className="text-dark-text font-bold text-base mb-1">No progress photos uploaded</Text>
              <Text className="text-dark-muted text-xs text-center mb-6 max-w-[280px]">
                Add photos taken from Front, Side, and Back angles to visually track changes in body composition.
              </Text>
              <Button title="Upload Photo" onPress={() => setShowPhotoModal(true)} size="md" />
            </Card>
          ) : (
            <View>
              {/* Photo Comparison Slider layout */}
              <Card title="Side-by-Side Comparison" subtitle="Compare before & after progress side by side">
                {photos.length < 2 ? (
                  <Text className="text-dark-muted text-xs py-4 text-center">
                    Upload at least 2 photos to use the comparison viewer.
                  </Text>
                ) : (
                  <View>
                    <View className="flex-row justify-between mb-4 gap-2">
                      <View className="flex-1 bg-zinc-950 border border-dark-border rounded-xl px-2.5 py-1.5">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">Before</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1">
                          <View className="flex-row gap-1">
                            {photos.map((p) => (
                              <Pressable
                                key={p.id}
                                onPress={() => setBeforePhotoId(p.id)}
                                className={`px-2 py-1 rounded-md border ${
                                  beforePhotoId === p.id
                                    ? 'bg-brand/20 border-brand'
                                    : 'bg-zinc-900 border-zinc-800'
                                }`}
                              >
                                <Text className="text-[10px] text-dark-text font-semibold uppercase">
                                  {p.photoType} ({new Date(p.takenAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>
                      </View>

                      <View className="flex-1 bg-zinc-950 border border-dark-border rounded-xl px-2.5 py-1.5">
                        <Text className="text-[9px] text-zinc-500 font-bold uppercase">After</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1">
                          <View className="flex-row gap-1">
                            {photos.map((p) => (
                              <Pressable
                                key={p.id}
                                onPress={() => setAfterPhotoId(p.id)}
                                className={`px-2 py-1 rounded-md border ${
                                  afterPhotoId === p.id
                                    ? 'bg-brand/20 border-brand'
                                    : 'bg-zinc-900 border-zinc-800'
                                }`}
                              >
                                <Text className="text-[10px] text-dark-text font-semibold uppercase">
                                  {p.photoType} ({new Date(p.takenAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    </View>

                    <View className="flex-row gap-3 justify-center items-center">
                      <View className="flex-1 items-center bg-zinc-950 rounded-2xl overflow-hidden border border-dark-border h-48 justify-center">
                        {beforePhoto ? (
                          <Image
                            source={{ uri: beforePhoto.photoUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Text className="text-zinc-600 text-xs font-semibold uppercase">Select Before</Text>
                        )}
                      </View>

                      <View className="flex-1 items-center bg-zinc-950 rounded-2xl overflow-hidden border border-dark-border h-48 justify-center">
                        {afterPhoto ? (
                          <Image
                            source={{ uri: afterPhoto.photoUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Text className="text-zinc-600 text-xs font-semibold uppercase">Select After</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </Card>

              {/* Progress Photos Grid */}
              <Text className="text-brand font-bold text-xs uppercase tracking-widest mb-3">Photo Library</Text>
              <View className="flex-row flex-wrap gap-3">
                {photos.map((photo) => (
                  <View
                    key={photo.id}
                    className="w-[47%] bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
                  >
                    <Image source={{ uri: photo.photoUrl }} className="w-full h-40" />
                    <View className="p-3 flex-row justify-between items-center bg-zinc-900/60">
                      <View>
                        <Text className="text-[10px] text-brand font-extrabold uppercase tracking-wide">
                          {photo.photoType}
                        </Text>
                        <Text className="text-dark-muted text-[9px] mt-0.5">
                          {new Date(photo.takenAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeletePhoto(photo.id)}
                        className="w-7 h-7 rounded-lg bg-red-950/20 border border-red-500/20 items-center justify-center active:bg-red-950/40"
                      >
                        <Text className="text-red-400 font-bold text-xs">×</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 1. Log Stats Modal */}
      <Modal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log Measurements"
        footer={
          <React.Fragment>
            <Button title="Cancel" variant="ghost" onPress={() => setShowLogModal(false)} size="sm" />
            <Button title="Save Entry" variant="primary" onPress={handleSaveMeasurement} size="sm" />
          </React.Fragment>
        }
      >
        <ScrollView className="gap-3.5 max-h-[55vh]">
          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Weight (kg)</Text>
              <TextInput
                value={formWeight}
                onChangeText={setFormWeight}
                keyboardType="decimal-pad"
                placeholder="e.g. 78.5"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Neck (cm)</Text>
              <TextInput
                value={formNeck}
                onChangeText={setFormNeck}
                keyboardType="decimal-pad"
                placeholder="e.g. 38.0"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
          </View>

          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Chest (cm)</Text>
              <TextInput
                value={formChest}
                onChangeText={setFormChest}
                keyboardType="decimal-pad"
                placeholder="e.g. 102.5"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Waist (cm)</Text>
              <TextInput
                value={formWaist}
                onChangeText={setFormWaist}
                keyboardType="decimal-pad"
                placeholder="e.g. 84.0"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
          </View>

          <Text className="text-brand font-bold text-[10px] uppercase tracking-wider mt-1">Arm Measurements</Text>
          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Left Arm (cm)</Text>
              <TextInput
                value={formBicepLeft}
                onChangeText={setFormBicepLeft}
                keyboardType="decimal-pad"
                placeholder="e.g. 37.0"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Right Arm (cm)</Text>
              <TextInput
                value={formBicepRight}
                onChangeText={setFormBicepRight}
                keyboardType="decimal-pad"
                placeholder="e.g. 37.2"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
          </View>

          <Text className="text-brand font-bold text-[10px] uppercase tracking-wider mt-1">Forearm Measurements</Text>
          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Left Forearm (cm)</Text>
              <TextInput
                value={formForearmLeft}
                onChangeText={setFormForearmLeft}
                keyboardType="decimal-pad"
                placeholder="e.g. 30.5"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Right Forearm (cm)</Text>
              <TextInput
                value={formForearmRight}
                onChangeText={setFormForearmRight}
                keyboardType="decimal-pad"
                placeholder="e.g. 30.7"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
          </View>

          <Text className="text-brand font-bold text-[10px] uppercase tracking-wider mt-1">Thigh Measurements</Text>
          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Left Thigh (cm)</Text>
              <TextInput
                value={formThighLeft}
                onChangeText={setFormThighLeft}
                keyboardType="decimal-pad"
                placeholder="e.g. 58.0"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-muted text-[10px] font-bold uppercase mb-1">Right Thigh (cm)</Text>
              <TextInput
                value={formThighRight}
                onChangeText={setFormThighRight}
                keyboardType="decimal-pad"
                placeholder="e.g. 58.3"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-dark-border text-dark-text rounded-xl p-3 text-sm font-semibold"
              />
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* 2. Upload Progress Photo Modal */}
      <Modal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title="Add Progress Photo"
        footer={
          <React.Fragment>
            <Button title="Cancel" variant="ghost" onPress={() => setShowPhotoModal(false)} size="sm" />
            <Button title="Save Photo" variant="primary" onPress={handleAddPhotoMock} size="sm" />
          </React.Fragment>
        }
      >
        <View className="gap-4">
          <Text className="text-dark-text text-sm leading-relaxed">
            Choose an angle to simulate uploading a progress photo to the local device storage.
          </Text>

          <View className="flex-row justify-around gap-2 my-2">
            {(['front', 'side', 'back'] as const).map((angle) => (
              <Pressable
                key={angle}
                onPress={() => setPhotoType(angle)}
                className={`flex-1 py-3 border rounded-xl uppercase font-bold items-center ${
                  photoType === angle
                    ? 'bg-brand/20 border-brand text-brand'
                    : 'bg-zinc-900 border-dark-border text-dark-muted active:bg-zinc-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase ${
                    photoType === angle ? 'text-brand' : 'text-dark-muted'
                  }`}
                >
                  {angle}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Photo Preview Indicator */}
          <View className="bg-zinc-950 border border-dark-border rounded-2xl h-44 overflow-hidden items-center justify-center">
            <Image source={{ uri: samplePhotos[photoType] }} className="w-full h-full" resizeMode="cover" />
            <View className="absolute bg-black/60 px-3 py-1 rounded-full border border-zinc-800">
              <Text className="text-brand text-[10px] font-bold uppercase tracking-widest">{photoType} Preview</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom spacer */}
      <View className="h-16" />
    </ScrollView>
  );
};
