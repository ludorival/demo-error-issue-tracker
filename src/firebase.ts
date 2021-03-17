import firebase from "firebase";
import {
  ErrorDatabase,
  SavedTrackedErrors,
  TrackedErrors,
} from "error-issue-tracker-sdk";

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_APIKEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTHDOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECTID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGINGSENDERID,
  appId: process.env.REACT_APP_FIREBASE_APPID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENTID,
};
firebase.initializeApp(config);

const firestore = firebase.firestore();

export class ErrorFirestore implements ErrorDatabase {
  private readonly ref: firebase.firestore.CollectionReference;
  constructor() {
    this.ref = firestore.collection("trackedErrors");
  }
  async save(error: TrackedErrors): Promise<SavedTrackedErrors> {
    if ("id" in error) {
      await this.ref.doc(error.id).set(error);
      return error as SavedTrackedErrors;
    }
    const docRef = await this.ref.add(error);
    return {
      ...error,
      id: docRef.id,
    };
  }
  onRead(
    projectId: string,
    callback: (trackedErrors: SavedTrackedErrors[]) => void
  ) {
    return this.ref
      .where("projectId", "==", projectId)
      .onSnapshot((snapshots) => {
        const errors = [] as SavedTrackedErrors[];
        snapshots.forEach((snapshot) => {
          errors.push({
            ...(snapshot.data() as SavedTrackedErrors),
            id: snapshot.id,
          });
        });
        callback(errors);
      });
  }
  async fetch(projectId: string): Promise<SavedTrackedErrors[]> {
    const snapshots = (
      await (await this.ref.where("projectId", "==", projectId)).get()
    ).docs;
    return snapshots.map((snapshot) => {
      const data = snapshot.data() as SavedTrackedErrors;
      return { ...data, id: snapshot.id };
    });
  }

  async delete(trackedError: SavedTrackedErrors): Promise<void> {
    await this.ref.doc(trackedError.id).delete();
  }
}

const provider = new firebase.auth.GithubAuthProvider();
provider.addScope("repo");

export type User = { displayName: string, photoUrl: string, githubToken: string };
export const getGithubUser = async () => {
  try {
    const currentUser = getCachedUser();
    if (currentUser) return currentUser
    const result = await firebase.auth().getRedirectResult();
    const githubToken = (result?.credential as any)?.accessToken;
    if (result.user && githubToken) {
      const user = { displayName: result.user.displayName || result.user.email, githubToken, photoUrl: result.user.photoURL } as User
      window.localStorage.setItem('currentUser', JSON.stringify(user))
      return user;
    }
  } catch (error) {
    return undefined;
  }
};

export const loginWithGithub = async () => {
  await firebase.auth().signInWithRedirect(provider);
};

export const logoutWithGithub = async () => {
  window.localStorage.removeItem("currentUser")
  await firebase.auth().signOut();
};

const getCachedUser = (): User | undefined => {
  const currentUser = window.localStorage.getItem("currentUser")
  return currentUser ? JSON.parse(currentUser) as User : undefined
};
