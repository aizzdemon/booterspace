(function profilePage() {
  let currentUser;

  async function getFirestoreFns() {
    return import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  }

  async function loadMyProfile() {
    const { doc, getDoc } = await getFirestoreFns();
    const ref = doc(window.db, "users", currentUser.uid);
    const snap = await getDoc(ref);

    const data = snap.exists() ? snap.data() : {};
    const avatar = data.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.displayName || currentUser.uid}`;

    document.getElementById("myProfile").innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow">
      <img id="avatar" src="${avatar}" class="w-28 h-28 rounded-full mx-auto border">
      <input id="avatarSeed" class="border p-2 w-full mt-3" placeholder="Type name for avatar">
      <button onclick="generateAvatar()" class="bg-gray-200 w-full py-1 mt-2">Generate Avatar</button>
      <h2 class="text-xl font-bold text-center mt-3">${currentUser.displayName || "User"}</h2>
      <textarea id="bio" class="border p-2 w-full mt-3" placeholder="Your bio">${data.bio || ""}</textarea>
      <input id="skills" class="border p-2 w-full mt-2" placeholder="Skills" value="${data.skills || ""}">
      <input id="college" class="border p-2 w-full mt-2" placeholder="College" value="${data.college || ""}">
      <input id="company" class="border p-2 w-full mt-2" placeholder="Company" value="${data.company || ""}">
      <button onclick="saveProfile()" class="bg-blue-600 text-white w-full py-2 mt-4 rounded">Save</button>
    </div>`;
  }

  window.generateAvatar = () => {
    const seed = document.getElementById("avatarSeed").value;
    document.getElementById("avatar").src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
  };

  window.saveProfile = async () => {
    const { doc, setDoc } = await getFirestoreFns();

    const avatar = document.getElementById("avatar").src;
    const bio = document.getElementById("bio").value;
    const skills = document.getElementById("skills").value;
    const college = document.getElementById("college").value;
    const company = document.getElementById("company").value;

    const keywords = `${currentUser.displayName || ""} ${college} ${company} ${skills}`.toLowerCase().split(" ");

    await setDoc(doc(window.db, "users", currentUser.uid), {
      name: currentUser.displayName,
      email: currentUser.email,
      avatar,
      bio,
      skills,
      college,
      company,
      searchKeywords: keywords
    }, { merge: true });

    alert("Profile Updated");
  };

  window.searchUsers = async () => {
    const { collection, query, where, getDocs } = await getFirestoreFns();

    const text = document.getElementById("searchInput").value.toLowerCase();
    const q = query(collection(window.db, "users"), where("searchKeywords", "array-contains", text));
    const snap = await getDocs(q);

    document.getElementById("searchResults").innerHTML = "";

    snap.forEach((docSnap) => {
      const u = docSnap.data();
      document.getElementById("searchResults").innerHTML += `
      <div class="bg-white p-4 rounded shadow flex gap-4">
        <img src="${u.avatar}" class="w-16 h-16 rounded-full">
        <div>
          <h3 class="font-bold">${u.name}</h3>
          <p class="text-sm">${u.company || ""}</p>
          <p class="text-xs text-gray-500">${u.college || ""}</p>
        </div>
      </div>`;
    });

    document.getElementById("myProfile").classList.add("md:col-span-1");
  };

  window.authReady.then((user) => {
    currentUser = user;
    return loadMyProfile();
  });
})();
