import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import CreatePostScreen from '../screens/CreatePostScreen';
import PostCommentsScreen from '../screens/PostCommentsScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import ChallengesFeedScreen from '../screens/ChallengesFeedScreen';
import SubmitChallengeEntryScreen from '../screens/SubmitChallengeEntryScreen';
import ChallengesLeaderboardScreen from '../screens/ChallengesLeaderboardScreen';
import SendRelationshipRequestScreen from '../screens/SendRelationshipRequestScreen';
import RelationshipRequestsScreen from '../screens/RelationshipRequestsScreen';
import CouplesChallengesScreen from '../screens/CouplesChallengesScreen';
import CouplesHubScreen from '../screens/CouplesHubScreen';
import TruthOrDareScreen from '../screens/TruthOrDareScreen';
import SpinTheBottleScreen from '../screens/SpinTheBottleScreen';
import CouplesCardsScreen from '../screens/CouplesCardsScreen';
import SponsorChallengeScreen from '../screens/SponsorChallengeScreen';
import CreateCampaignScreen from '../screens/CreateCampaignScreen';
import MyCampaignsScreen from '../screens/MyCampaignsScreen';
import CampaignAnalyticsScreen from '../screens/CampaignAnalyticsScreen';
import CampaignDetailScreen from '../screens/CampaignDetailScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CreateCommunityScreen from '../screens/CreateCommunityScreen';
import UnderConstructionScreen from '../screens/UnderConstructionScreen';
import ExternalAppScreen from '../screens/hub/ExternalAppScreen';
import LiveScreen from '../screens/live/LiveScreen';
import LiveCategoriesScreen from '../screens/live/LiveCategoriesScreen';
import LiveCategoryScreen from '../screens/live/LiveCategoryScreen';
import LiveViewerScreen from '../screens/live/LiveViewerScreen';
import GoLiveScreen from '../screens/live/GoLiveScreen';
import LiveHostScreen from '../screens/live/LiveHostScreen';
import LiveCreatorProfileScreen from '../screens/live/LiveCreatorProfileScreen';
import DashboardScreen from '../screens/profile/DashboardScreen';
import MyStokvelsScreen from '../screens/finance/MyStokvelsScreen';
import CreateStokvelScreen from '../screens/finance/CreateStokvelScreen';
import StokvelDetailScreen from '../screens/finance/StokvelDetailScreen';
import MyStoreScreen from '../screens/profile/eat/MyStoreScreen';
import AddEditStoreScreen from '../screens/profile/eat/AddEditStoreScreen';
import AddEditProductScreen from '../screens/profile/eat/AddEditProductScreen';
import StoreOrdersScreen from '../screens/profile/eat/StoreOrdersScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import VideoPlayerScreen from '../screens/discover/VideoPlayerScreen';
import VideoUploadScreen from '../screens/discover/VideoUploadScreen';
import WatchLaterScreen from '../screens/discover/WatchLaterScreen';
import PlaylistsScreen from '../screens/discover/PlaylistsScreen';
import PlaylistDetailScreen from '../screens/discover/PlaylistDetailScreen';
import InterestPickerScreen from '../screens/discover/InterestPickerScreen';
import AiSetupScreen from '../screens/ai/AiSetupScreen';
import AiAccessScreen from '../screens/ai/AiAccessScreen';
import AiChatScreen from '../screens/ai/AiChatScreen';
import AiTourScreen from '../screens/ai/AiTourScreen';
import McpApprovalsScreen from '../screens/ai/McpApprovalsScreen';
import CompanionChatScreen from '../screens/ai/CompanionChatScreen';
import CallScreen from '../screens/calls/CallScreen';
import MoonBaseScreen from '../screens/moonbase/MoonBaseScreen';
import MoonRoomScreen from '../screens/moonbase/MoonRoomScreen';
import MoonAvatarScreen from '../screens/moonbase/MoonAvatarScreen';
import PropertyHomeScreen from '../screens/property/PropertyHomeScreen';
import PropertyFormScreen from '../screens/property/PropertyFormScreen';
import VerifyAccountScreen from '../screens/VerifyAccountScreen';
import PropertyDetailScreen from '../screens/property/PropertyDetailScreen';
import MyPropertiesScreen from '../screens/property/MyPropertiesScreen';
import MyRentalsScreen from '../screens/property/MyRentalsScreen';
import LeaseScreen from '../screens/property/LeaseScreen';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import StatusViewersScreen from '../screens/StatusViewersScreen';
import MediaEditorScreen from '../screens/editor/MediaEditorScreen';
import PosterCreatorScreen from '../screens/editor/PosterCreatorScreen';
import PosterResultScreen from '../screens/editor/PosterResultScreen';
import MarketplaceHomeScreen from '../screens/marketplace/MarketplaceHomeScreen';
import MarketplaceFormScreen from '../screens/marketplace/MarketplaceFormScreen';
import MarketplaceDetailScreen from '../screens/marketplace/MarketplaceDetailScreen';
import UsernameMarketHomeScreen from '../screens/usernames/UsernameMarketHomeScreen';
import UsernameFormScreen from '../screens/usernames/UsernameFormScreen';
import UsernameDetailScreen from '../screens/usernames/UsernameDetailScreen';
import MyUsernamesScreen from '../screens/usernames/MyUsernamesScreen';
import MyListingsScreen from '../screens/marketplace/MyListingsScreen';
import MyBidsScreen from '../screens/marketplace/MyBidsScreen';
import InvoiceScreen from '../screens/marketplace/InvoiceScreen';
import MyShoppingStoreScreen from '../screens/profile/shopping/MyShoppingStoreScreen';
import AddEditShoppingStoreScreen from '../screens/profile/shopping/AddEditShoppingStoreScreen';
import AddEditShoppingProductScreen from '../screens/profile/shopping/AddEditShoppingProductScreen';
import ShoppingStoreOrdersScreen from '../screens/profile/shopping/ShoppingStoreOrdersScreen';
import MyTravelListingsScreen from '../screens/profile/travel/MyTravelListingsScreen';
import AddEditTravelStayScreen from '../screens/profile/travel/AddEditTravelStayScreen';
import AddEditTravelCarScreen from '../screens/profile/travel/AddEditTravelCarScreen';
import MyCarWashesScreen from '../screens/carwash/MyCarWashesScreen';
import ManageCarWashScreen from '../screens/carwash/ManageCarWashScreen';
import MyCompanyScreen from '../screens/profile/work/MyCompanyScreen';
import AddEditWorkCompanyScreen from '../screens/profile/work/AddEditWorkCompanyScreen';
import AddEditWorkJobScreen from '../screens/profile/work/AddEditWorkJobScreen';
import WorkJobApplicantsScreen from '../screens/profile/work/WorkJobApplicantsScreen';
import MyGigsScreen from '../screens/profile/work/MyGigsScreen';
import AddEditWorkGigScreen from '../screens/profile/work/AddEditWorkGigScreen';
import MyFreelanceWorkScreen from '../screens/profile/work/MyFreelanceWorkScreen';
import MyPractitionerScreen from '../screens/profile/health/MyPractitionerScreen';
import AddEditHealthPractitionerScreen from '../screens/profile/health/AddEditHealthPractitionerScreen';
import MySalonScreen from '../screens/profile/hair/MySalonScreen';
import AddEditSalonScreen from '../screens/profile/hair/AddEditSalonScreen';
import AddEditSalonServiceScreen from '../screens/profile/hair/AddEditSalonServiceScreen';
import AddEditSalonProductScreen from '../screens/profile/hair/AddEditSalonProductScreen';
import MyPharmacyScreen from '../screens/profile/health/MyPharmacyScreen';
import AddEditHealthPharmacyScreen from '../screens/profile/health/AddEditHealthPharmacyScreen';
import AddEditHealthProductScreen from '../screens/profile/health/AddEditHealthProductScreen';
import HealthPharmacyOrdersScreen from '../screens/profile/health/HealthPharmacyOrdersScreen';
import AddWellnessPostScreen from '../screens/profile/health/AddWellnessPostScreen';
import MyCoursesScreen from '../screens/profile/learning/MyCoursesScreen';
import AddEditCourseScreen from '../screens/profile/learning/AddEditCourseScreen';
import CourseLessonsScreen from '../screens/profile/learning/CourseLessonsScreen';
import AddLessonScreen from '../screens/profile/learning/AddLessonScreen';
import MyTutorProfileScreen from '../screens/profile/learning/MyTutorProfileScreen';
import TutorSessionsScreen from '../screens/profile/learning/TutorSessionsScreen';
import AddCommunityScreen from '../screens/profile/learning/AddCommunityScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SecurityPrivacyScreen from '../screens/profile/SecurityPrivacyScreen';
import ConnectedAppsScreen from '../screens/profile/ConnectedAppsScreen';
import NotificationsSettingsScreen from '../screens/profile/NotificationsSettingsScreen';
import AppearanceScreen from '../screens/profile/AppearanceScreen';
import LanguageScreen from '../screens/profile/LanguageScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import HairHomeScreen from '../screens/hub/hair/HairHomeScreen';
import HairdresserProfileScreen from '../screens/hub/hair/HairdresserProfileScreen';
import HairServiceScreen from '../screens/hub/hair/HairServiceScreen';
import HairBookingScreen from '../screens/hub/hair/HairBookingScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import UserPostsScreen from '../screens/UserPostsScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} />
          <Stack.Screen name="PostComments" component={PostCommentsScreen} />
          <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
          <Stack.Screen name="ChallengesFeed" component={ChallengesFeedScreen} />
          <Stack.Screen name="SubmitChallengeEntry" component={SubmitChallengeEntryScreen} />
          <Stack.Screen name="ChallengesLeaderboard" component={ChallengesLeaderboardScreen} />
          <Stack.Screen name="SendRelationshipRequest" component={SendRelationshipRequestScreen} />
          <Stack.Screen name="RelationshipRequests" component={RelationshipRequestsScreen} />
          <Stack.Screen name="CouplesChallenges" component={CouplesChallengesScreen} />
          <Stack.Screen name="CouplesHub" component={CouplesHubScreen} />
          <Stack.Screen name="TruthOrDare" component={TruthOrDareScreen} />
          <Stack.Screen name="SpinTheBottle" component={SpinTheBottleScreen} />
          <Stack.Screen name="CouplesCards" component={CouplesCardsScreen} />
          <Stack.Screen name="SponsorChallenge" component={SponsorChallengeScreen} />
          <Stack.Screen name="CreateCampaign" component={CreateCampaignScreen} />
          <Stack.Screen name="MyCampaigns" component={MyCampaignsScreen} />
          <Stack.Screen name="CampaignAnalytics" component={CampaignAnalyticsScreen} />
          <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
          <Stack.Screen name="Community" component={CommunityScreen} />
          <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
          <Stack.Screen name="UnderConstruction" component={UnderConstructionScreen} />
          <Stack.Screen name="ExternalApp" component={ExternalAppScreen} />
          <Stack.Screen name="Live" component={LiveScreen} />
          <Stack.Screen name="LiveCategories" component={LiveCategoriesScreen} />
          <Stack.Screen name="LiveCategory" component={LiveCategoryScreen} />
          <Stack.Screen name="LiveViewer" component={LiveViewerScreen} />
          <Stack.Screen name="GoLive" component={GoLiveScreen} />
          <Stack.Screen name="LiveHost" component={LiveHostScreen} />
          <Stack.Screen name="LiveCreatorProfile" component={LiveCreatorProfileScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="MyStokvels" component={MyStokvelsScreen} />
          <Stack.Screen name="CreateStokvel" component={CreateStokvelScreen} />
          <Stack.Screen name="StokvelDetail" component={StokvelDetailScreen} />
          <Stack.Screen name="MyStore" component={MyStoreScreen} />
          <Stack.Screen name="AddEditStore" component={AddEditStoreScreen} />
          <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
          <Stack.Screen name="StoreOrders" component={StoreOrdersScreen} />
          <Stack.Screen name="Discovery" component={DiscoverScreen} />
          <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
          <Stack.Screen name="VideoUpload" component={VideoUploadScreen} />
          <Stack.Screen name="WatchLater" component={WatchLaterScreen} />
          <Stack.Screen name="MyPlaylists" component={PlaylistsScreen} />
          <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
          <Stack.Screen name="InterestPicker" component={InterestPickerScreen} />
          <Stack.Screen name="AiSetup" component={AiSetupScreen} />
          <Stack.Screen name="AiAccess" component={AiAccessScreen} />
          <Stack.Screen name="AiChat" component={AiChatScreen} />
          <Stack.Screen name="AiTour" component={AiTourScreen} />
          <Stack.Screen name="McpApprovals" component={McpApprovalsScreen} />
          <Stack.Screen name="CompanionChat" component={CompanionChatScreen} />
          <Stack.Screen name="CallScreen" component={CallScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="MoonBase" component={MoonBaseScreen} />
          <Stack.Screen name="MoonRoom" component={MoonRoomScreen} />
          <Stack.Screen name="MoonAvatar" component={MoonAvatarScreen} />
          <Stack.Screen name="PropertyHome" component={PropertyHomeScreen} />
          <Stack.Screen name="PropertyForm" component={PropertyFormScreen} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
          <Stack.Screen name="MyProperties" component={MyPropertiesScreen} />
          <Stack.Screen name="MyRentals" component={MyRentalsScreen} />
          <Stack.Screen name="Lease" component={LeaseScreen} />
          <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
          <Stack.Screen name="MarketplaceHome" component={MarketplaceHomeScreen} />
          <Stack.Screen name="MarketplaceForm" component={MarketplaceFormScreen} />
          <Stack.Screen name="MarketplaceDetail" component={MarketplaceDetailScreen} />
          <Stack.Screen name="MyListings" component={MyListingsScreen} />
          <Stack.Screen name="MyBids" component={MyBidsScreen} />
          <Stack.Screen name="UsernameMarketHome" component={UsernameMarketHomeScreen} />
          <Stack.Screen name="UsernameForm" component={UsernameFormScreen} />
          <Stack.Screen name="UsernameDetail" component={UsernameDetailScreen} />
          <Stack.Screen name="MyUsernames" component={MyUsernamesScreen} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} />
          <Stack.Screen name="MyShoppingStore" component={MyShoppingStoreScreen} />
          <Stack.Screen name="AddEditShoppingStore" component={AddEditShoppingStoreScreen} />
          <Stack.Screen name="AddEditShoppingProduct" component={AddEditShoppingProductScreen} />
          <Stack.Screen name="ShoppingStoreOrders" component={ShoppingStoreOrdersScreen} />
          <Stack.Screen name="MyTravelListings" component={MyTravelListingsScreen} />
          <Stack.Screen name="AddEditTravelStay" component={AddEditTravelStayScreen} />
          <Stack.Screen name="AddEditTravelCar" component={AddEditTravelCarScreen} />
          <Stack.Screen name="MyCarWashes" component={MyCarWashesScreen} />
          <Stack.Screen name="ManageCarWash" component={ManageCarWashScreen} />
          <Stack.Screen name="MyCompany" component={MyCompanyScreen} />
          <Stack.Screen name="AddEditWorkCompany" component={AddEditWorkCompanyScreen} />
          <Stack.Screen name="AddEditWorkJob" component={AddEditWorkJobScreen} />
          <Stack.Screen name="WorkJobApplicants" component={WorkJobApplicantsScreen} />
          <Stack.Screen name="MyGigs" component={MyGigsScreen} />
          <Stack.Screen name="AddEditWorkGig" component={AddEditWorkGigScreen} />
          <Stack.Screen name="MyFreelanceWork" component={MyFreelanceWorkScreen} />
          <Stack.Screen name="MyPractitioner" component={MyPractitionerScreen} />
          <Stack.Screen name="AddEditHealthPractitioner" component={AddEditHealthPractitionerScreen} />
          <Stack.Screen name="MySalon" component={MySalonScreen} />
          <Stack.Screen name="AddEditSalon" component={AddEditSalonScreen} />
          <Stack.Screen name="AddEditSalonService" component={AddEditSalonServiceScreen} />
          <Stack.Screen name="AddEditSalonProduct" component={AddEditSalonProductScreen} />
          <Stack.Screen name="MyPharmacy" component={MyPharmacyScreen} />
          <Stack.Screen name="AddEditHealthPharmacy" component={AddEditHealthPharmacyScreen} />
          <Stack.Screen name="AddEditHealthProduct" component={AddEditHealthProductScreen} />
          <Stack.Screen name="HealthPharmacyOrders" component={HealthPharmacyOrdersScreen} />
          <Stack.Screen name="AddWellnessPost" component={AddWellnessPostScreen} />
          <Stack.Screen name="MyCourses" component={MyCoursesScreen} />
          <Stack.Screen name="AddEditCourse" component={AddEditCourseScreen} />
          <Stack.Screen name="CourseLessons" component={CourseLessonsScreen} />
          <Stack.Screen name="AddLesson" component={AddLessonScreen} />
          <Stack.Screen name="MyTutorProfile" component={MyTutorProfileScreen} />
          <Stack.Screen name="TutorSessions" component={TutorSessionsScreen} />
          <Stack.Screen name="AddCommunity" component={AddCommunityScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreen} />
          <Stack.Screen name="ConnectedApps" component={ConnectedAppsScreen} />
          <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
          <Stack.Screen name="Appearance" component={AppearanceScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
          <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="StatusViewers" component={StatusViewersScreen} />
          <Stack.Screen name="MediaEditor" component={MediaEditorScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="PosterCreator" component={PosterCreatorScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="PosterResult" component={PosterResultScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="HairHome" component={HairHomeScreen} />
          <Stack.Screen name="HairdresserProfile" component={HairdresserProfileScreen} />
          <Stack.Screen name="HairService" component={HairServiceScreen} />
          <Stack.Screen name="HairBooking" component={HairBookingScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="UserPosts" component={UserPostsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
