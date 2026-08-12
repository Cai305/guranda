import { fetchApi } from '../utils/api';

// Real per-category actions for Guranda Live, layered on top of the
// core room API in liveApi.ts. Every function here talks to a real
// backend endpoint — no mock data, no comingSoon() stubs.

async function unwrap(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Something went wrong');
  }
  return res.json();
}

export function getRoomState(roomId: string) {
  return fetchApi(`/live/rooms/${roomId}/state`).then(unwrap);
}

export const getFriends = () => fetchApi('/friends').then(unwrap);

// Conversation Live
export const updateConversationTopic = (roomId: string, topic: string) =>
  fetchApi(`/live/rooms/${roomId}/topic`, { method: 'PATCH', body: JSON.stringify({ topic }) }).then(unwrap);

// Live Shopping
export const pinShoppingProduct = (roomId: string, productId: string) =>
  fetchApi(`/live/rooms/${roomId}/pin-product`, { method: 'POST', body: JSON.stringify({ productId }) }).then(unwrap);
export const buyPinnedProduct = (roomId: string, quantity: number, shippingAddress: string) =>
  fetchApi(`/live/rooms/${roomId}/buy-pinned`, { method: 'POST', body: JSON.stringify({ quantity, shippingAddress }) }).then(unwrap);
export const getMyShoppingStore = () => fetchApi('/shopping/my-store').then(unwrap);
export const saveShowcase = (roomId: string, productIds: string[], style: 'SPOTLIGHT' | 'SHELF') =>
  fetchApi(`/live/rooms/${roomId}/showcase`, { method: 'POST', body: JSON.stringify({ productIds, style }) }).then(unwrap);
export const setSpotlight = (roomId: string, index: number) =>
  fetchApi(`/live/rooms/${roomId}/showcase/spotlight`, { method: 'PATCH', body: JSON.stringify({ index }) }).then(unwrap);
export const buyShowcaseProduct = (roomId: string, productId: string, quantity: number, shippingAddress: string) =>
  fetchApi(`/live/rooms/${roomId}/showcase/buy`, { method: 'POST', body: JSON.stringify({ productId, quantity, shippingAddress }) }).then(unwrap);

// Food Live
export const pinEatProduct = (roomId: string, productId: string) =>
  fetchApi(`/live/rooms/${roomId}/pin-food`, { method: 'POST', body: JSON.stringify({ productId }) }).then(unwrap);
export const orderPinnedFood = (roomId: string, quantity: number, deliveryAddress: string) =>
  fetchApi(`/live/rooms/${roomId}/order-pinned`, { method: 'POST', body: JSON.stringify({ quantity, deliveryAddress }) }).then(unwrap);
export const getMyEatStore = () => fetchApi('/eat/my-store').then(unwrap);

// Gaming Live
export const linkGame = (roomId: string, gameType: string, gameId: string) =>
  fetchApi(`/live/rooms/${roomId}/link-game`, { method: 'POST', body: JSON.stringify({ gameType, gameId }) }).then(unwrap);
export const startChessMatch = (
  roomId: string,
  dto: { mode: 'HOST_PLAYS' | 'HOST_MANAGES'; opponentId?: string; whiteId?: string; blackId?: string },
) => fetchApi(`/live/rooms/${roomId}/chess/start`, { method: 'POST', body: JSON.stringify(dto) }).then(unwrap);

// Business Live
export const connectWithHost = (roomId: string) =>
  fetchApi(`/live/rooms/${roomId}/connect`, { method: 'POST' }).then(unwrap);

// Education Live
export const launchQuiz = (roomId: string, question: string, options: string[], correctIndex: number, prizePool: number) =>
  fetchApi(`/live/rooms/${roomId}/quiz`, { method: 'POST', body: JSON.stringify({ question, options, correctIndex, prizePool }) }).then(unwrap);
export const answerQuiz = (quizId: string, optionIndex: number) =>
  fetchApi(`/live/quiz/${quizId}/answer`, { method: 'POST', body: JSON.stringify({ optionIndex }) }).then(unwrap);
export const resolveQuiz = (quizId: string) =>
  fetchApi(`/live/quiz/${quizId}/resolve`, { method: 'POST' }).then(unwrap);

// Entertainment Live
export const launchPoll = (roomId: string, question: string, options: string[]) =>
  fetchApi(`/live/rooms/${roomId}/poll`, { method: 'POST', body: JSON.stringify({ question, options }) }).then(unwrap);
export const votePoll = (pollId: string, optionIndex: number) =>
  fetchApi(`/live/poll/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionIndex }) }).then(unwrap);

// Sports Live
export const updateScoreboard = (roomId: string, dto: { teamA?: string; teamB?: string; scoreA?: number; scoreB?: number }) =>
  fetchApi(`/live/rooms/${roomId}/score`, { method: 'PATCH', body: JSON.stringify(dto) }).then(unwrap);
export const launchPrediction = (roomId: string, question: string, optionA: string, optionB: string) =>
  fetchApi(`/live/rooms/${roomId}/prediction`, { method: 'POST', body: JSON.stringify({ question, optionA, optionB }) }).then(unwrap);
export const placeBet = (predictionId: string, pick: 'A' | 'B', amount: number) =>
  fetchApi(`/live/prediction/${predictionId}/bet`, { method: 'POST', body: JSON.stringify({ pick, amount }) }).then(unwrap);
export const resolvePrediction = (predictionId: string, winningPick: 'A' | 'B') =>
  fetchApi(`/live/prediction/${predictionId}/resolve`, { method: 'POST', body: JSON.stringify({ winningPick }) }).then(unwrap);

// Career Live
export const postJob = (roomId: string, title: string, description: string, salary: string) =>
  fetchApi(`/live/rooms/${roomId}/job`, { method: 'POST', body: JSON.stringify({ title, description, salary }) }).then(unwrap);
export const applyToJob = (jobId: string, message: string) =>
  fetchApi(`/live/job/${jobId}/apply`, { method: 'POST', body: JSON.stringify({ message }) }).then(unwrap);
export const getJobApplicants = (jobId: string) => fetchApi(`/live/job/${jobId}/applicants`).then(unwrap);

// Social Live
export const askQuestion = (roomId: string, text: string) =>
  fetchApi(`/live/rooms/${roomId}/question`, { method: 'POST', body: JSON.stringify({ text }) }).then(unwrap);
export const markQuestionAnswered = (questionId: string) =>
  fetchApi(`/live/question/${questionId}/answered`, { method: 'PATCH' }).then(unwrap);

// Dating Live
export const applyDating = (roomId: string, bio: string) =>
  fetchApi(`/live/rooms/${roomId}/dating/apply`, { method: 'POST', body: JSON.stringify({ bio }) }).then(unwrap);
export const getDatingApplicants = (roomId: string) =>
  fetchApi(`/live/rooms/${roomId}/dating/applicants`).then(unwrap);
export const featureDatingPair = (roomId: string, applicantAId: string, applicantBId: string) =>
  fetchApi(`/live/rooms/${roomId}/dating/feature`, { method: 'POST', body: JSON.stringify({ applicantAId, applicantBId }) }).then(unwrap);
export const passDatingPair = (roomId: string) =>
  fetchApi(`/live/rooms/${roomId}/dating/pass`, { method: 'POST' }).then(unwrap);
export const declareDatingMatch = (roomId: string) =>
  fetchApi(`/live/rooms/${roomId}/dating/match`, { method: 'POST' }).then(unwrap);

// Ride Live — flips the same DriverProfile.isOnline the standalone
// Ride screens (DriverView) use, so it's a real reachability toggle.
export const setRideOnlineStatus = (roomId: string, isOnline: boolean) =>
  fetchApi(`/live/rooms/${roomId}/ride/online`, { method: 'PATCH', body: JSON.stringify({ isOnline }) }).then(unwrap);

// Live moderation — host or any current moderator can call mute/unmute/kick/ban;
// assign/revoke moderator and unban are host-only (enforced server-side).
export const getModerationState = (roomId: string) =>
  fetchApi(`/live/rooms/${roomId}/moderation`).then(unwrap);
export const assignModerator = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/moderators`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);
export const revokeModerator = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/moderators/revoke`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);
export const muteUser = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/mute`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);
export const unmuteUser = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/unmute`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);
export const kickUser = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/kick`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);
export const banUser = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/ban`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);
export const unbanUser = (roomId: string, userId: string) =>
  fetchApi(`/live/rooms/${roomId}/unban`, { method: 'POST', body: JSON.stringify({ userId }) }).then(unwrap);

// Live stream reporting
export const reportLiveStream = (roomId: string, reportedUserId: string, reason: string, details?: string) =>
  fetchApi(`/live/reports/rooms/${roomId}`, { method: 'POST', body: JSON.stringify({ reportedUserId, reason, details }) }).then(unwrap);
