var { app, h } = hyperapp
var db = firebase.database()
if (!Cookies.get("matcha_cookie")) {
  Cookies.set("matcha_cookie", faker.name.firstName(), { expires: 7 })
}

const currentRoom = () => location.hash.length > 0 ? location.hash.slice(1) : "public"

const state = {
  text: "",
  posts: [],
  previewElement: undefined
}

const actions = {
  input: (text) => {
    return ((state) => {
      const pe = state.previewElement
      pe.textContent = text
      return ({
        text,
        previewElement: pe
      })
    })
  },
  store: (ev) => {
    ev.preventDefault()
    return ((state) => {
      if (state.text.length === 0) return
      const pe = state.previewElement
      pe.textContent = ""

      db.ref(refTarget).push({
        username: (Cookies.get("matcha_cookie") || "anonymous"),
        content: state.text,
        date: dateFns.format(new Date(), "HH:mm:ss.SS YYYY-MM-DD")
      })
      return ({ text: "", previewElement: pe })
    })
  },
  create: (el) => {
    return ({ previewElement: el })
  },
  update: (post) => {
    return ((state) => {
      return ({ posts: state.posts.concat(post) })
    })
  },
  reset: () => {
    return ({ posts: [] })
  }
}

const Head = () => {
  return h("div", { class: "row" }, [
    h("div", { class: "cell-lg-8" },
      h("h2", {},
        h("a", { href: "/", style: { textDecoration: "none", color: "#adb367" } }, "matcha")
      )
    ),
    h("div", { class: "cell-lg-4 d-flex flex-justify-end" }, [
      // h("button", { class: "button", title: "URLをコピー", onclick: () => copy() },
      //   h("span", { class: "mif-copy outline" })
      // ),
      h("button", { class: "button rounded", title: "新しいRoomを作成", onclick: () => newRoom(), style: { marginLeft: "0.5rem" } },
        h("span", { class: "mif-bubbles outline" })
      )
    ]),
  ])
}

const Form = ({ state, actions }) => {
  return h("div", { class: "row" },
    h("div", { class: "cell" }, [
      h("div", {
        class: "bg-grayWhite",
        style: { padding: "0.5rem", marginTop: "0.5rem" },
        hidden: state.text.length > 0 ? "" : "hidden",
        oncreate: (e) => actions.create(e),
        onupdate: (e) => katexRender(e)
      }),
      h("form", { onsubmit: (e) => actions.store(e), style: { marginTop: "0.5rem" } }, [
        h("div", { class: "form-group" },
          h("input", {
            type: "text",
            value: state.text,
            oninput: (e) => actions.input(e.target.value),
            oncreate: (e) => e.focus()
          }),
        ),
        h("div", { class: "form-group", style: { marginTop: "0.5rem" } },
          h("button", {
            class: "button rounded",
            type: "submit",
          }, "submit")
        )
      ])
    ])
  )
}

const List = ({ state }) => {
  return h("div", { class: "row", style: { marginTop: "0.5rem" } },
    h("div", { class: "cell" }, [
      ...(state.posts.map((post) => h("div", { class: "card", key: post.id, style: { width: "100%", margin: "0rem" } },
        h("div", { class: "card-content p-3" },
          h("div", { class: "row" }, [
            h("div", { class: "cell-md-2" }, post.username + ":"),
            h("div", { class: "cell-md-8", oncreate: (el) => katexRender(el) }, post.content),
            h("div", { class: "cell-md text-right" }, post.date)
          ])
        )
      ))).reverse()
    ])
  )
}

const view = (state, actions) => {
  return h("div", { class: "container", oncreate: () => init(), style: { marginTop: "1rem" } },
    h("div", { class: "grid" }, [
      Head(),
      Form({ state, actions }),
      h("div", { class: "row", style: { marginTop: "0.5rem" } },
        h("div", { class: "cell d-flex flex-justify-end" }, [
          h("span", { style: { fontSize: "0.9rem" } }, "現在のRoom: "),
          h("code", { title: "クリックしてURLをコピー", style: { color: "#6D67B3", cursor: "pointer" }, onclick: () => copy() }, currentRoom())
        ])
      ),
      List({ state })
    ])
  )
}

const main = app(state, actions, view, document.getElementById("root"))

let refTarget = "posts/" + currentRoom()
const onChildAdded = (response) => {
  const post = { ...response.val(), id: response.key }
  main.update(post)
}

window.addEventListener("hashchange", (ev) => {
  db.ref(refTarget).off("child_added", onChildAdded)
  main.reset() // えぇぇ
  refTarget = "posts/" + currentRoom()
  init()
})

const init = () => {
  db.ref(refTarget).once("value",
    (snapshot) => {
      if (snapshot.val() === null) {
        alert("指定されたRoomが見つかりません")
        if (location.hash.length > 0) {
          location.href = "/"
        }
      }
    }
  )
  db.ref(refTarget).on("child_added", onChildAdded)
}

const newRoom = () => {
  const roomID = faker.random.uuid()
  const n = new Noty({
    theme: "semanticui",
    layout: "topCenter",
    text: `新しいRoom (ID: ${roomID}) を作成しますか？`,
    type: "alert",
    closeWith: ["button"],
    modal: true,
    animation: {
      open: null,
      close: null
    },
    buttons: [
      Noty.button("はい", "button", () => {
        n.close()
        location.hash = roomID
        db.ref("posts/" + roomID).push({
          username: "ChatBot",
          content: `Congratulations! Roomの作成に成功しました。 RoomID: ${roomID}`,
          date: dateFns.format(new Date(), "HH:mm:ss.SS YYYY-MM-DD")
        })
      }, { style: "margin-right: 1rem" }),
      Noty.button("いいえ", "button", () => {
        n.close()
      })
    ]
  }).show()
}

const copy = () => {
  const tmp = document.createElement("input")
  tmp.value = location.href
  document.body.appendChild(tmp)
  tmp.select()
  document.execCommand("copy")
  tmp.parentElement.removeChild(tmp)
  new Noty({
    theme: "semanticui",
    type: "alert",
    layout: "topRight",
    text: "copied!",
    timeout: 1500,
    progressBar: false
  }).show()
}

const katexRender = (el) => {
  renderMathInElement(el, {
    delimiters: [
      { left: "$", right: "$", display: false }
    ],
    throwOnError: false
  })
}