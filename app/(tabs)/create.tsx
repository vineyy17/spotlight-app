import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Dimensions,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { styles } from "@/styles/create.styles";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

const { width } = Dimensions.get("window");

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useUser();

  const imageHeightAnim = useRef(new Animated.Value(width)).current;

  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Handle keyboard events with smoother animations
  useEffect(() => {
    const keyboardWillShowListener =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillShow", (e) => {
            Animated.timing(imageHeightAnim, {
              toValue: width * 0.6,
              duration: e.duration,
              useNativeDriver: false,
            }).start();
          })
        : Keyboard.addListener("keyboardDidShow", () => {
            Animated.timing(imageHeightAnim, {
              toValue: width * 0.6,
              duration: 250,
              useNativeDriver: false,
            }).start();
          });

    const keyboardWillHideListener =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillHide", (e) => {
            Animated.timing(imageHeightAnim, {
              toValue: width,
              duration: e.duration,
              useNativeDriver: false,
            }).start();
          })
        : Keyboard.addListener("keyboardDidHide", () => {
            Animated.timing(imageHeightAnim, {
              toValue: width,
              duration: 250,
              useNativeDriver: false,
            }).start();
          });

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);
      Keyboard.dismiss();

      const uploadUrl = await generateUploadUrl();

      const uploadResult = await FileSystem.uploadAsync(
        uploadUrl,
        selectedImage,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          mimeType: "image/jpeg",
        }
      );

      if (uploadResult.status !== 200) throw new Error("Upload failed");

      const { storageId } = JSON.parse(uploadResult.body);
      await createPost({ storageId, caption });

      setSelectedImage(null);
      setCaption("");

      router.push("/(tabs)");
    } catch (error) {
      console.log("Error sharing post", error);
    } finally {
      setIsSharing(false);
    }
  };

  if (!selectedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <View style={{ width: 28 }} />
        </View>

        <TouchableOpacity
          style={styles.emptyImageContainer}
          onPress={pickImage}
        >
          <Ionicons name="image-outline" size={48} color={COLORS.grey} />
          <Text style={styles.emptyImageText}>Tap to select an image</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            setSelectedImage(null);
            setCaption("");
          }}
          disabled={isSharing}
        >
          <Ionicons
            name="close-outline"
            size={28}
            color={isSharing ? COLORS.grey : COLORS.white}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
          disabled={isSharing || !selectedImage}
          onPress={handleShare}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.shareText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENT WITH ANIMATED IMAGE */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.flexContainer}>
          {/* IMAGE SECTION - Animated height */}
          <Animated.View
            style={[
              styles.imageSection,
              { height: imageHeightAnim },
              isSharing && styles.contentDisabled,
            ]}
          >
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <Image
                source={selectedImage}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableWithoutFeedback>
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={isSharing}
            >
              <Ionicons name="image-outline" size={20} color={COLORS.white} />
              <Text style={styles.changeImageText}>Change</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* INPUT SECTION */}
          <View style={styles.inputSection}>
            <View style={styles.captionContainer}>
              <Image
                source={user?.imageUrl}
                style={styles.userAvatar}
                contentFit="cover"
                transition={200}
              />
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor={COLORS.grey}
                multiline
                value={caption}
                onChangeText={setCaption}
                editable={!isSharing}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
