var { app, h } = hyperapp
var db = firebase.database()
if (!Cookies.get("matcha_cookie")) {
  Cookies.set("matcha_cookie", faker.name.firstName(), { expires: 7 })
}

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

      db.ref("posts").push({
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
  }
}

const Title = () => {
  return h("div", { class: "row" },
    h("div", { class: "cell" },
      h("h2", {}, "matcha")
    )
  )
}

const Form = ({ state, actions }) => {
  return h("div", { class: "row" },
    h("div", { class: "cell" }, [
      h("div", {
        class: "bg-grayWhite",
        style: { padding: "0.5rem" },
        hidden: state.text.length > 0 ? "" : "hidden",
        oncreate: (e) => actions.create(e),
        onupdate: (e) => render(e)
      }),
      h("form", { onsubmit: (e) => actions.store(e), style: { marginTop: "0.5rem" } }, [
        h("div", { class: "form-group" },
          h("input", {
            type: "text",
            value: state.text,
            oninput: (e) => actions.input(e.target.value),
            oncreate: (e) => e.focus()
          })
        ),
        h("div", { class: "form-group" },
          h("button", {
            class: "button",
            type: "submit",
          }, "submit")
        )
      ])
    ])
  )
}

const List = ({ state }) => {
  return h("div", { class: "row", style: { marginTop: "1rem" } },
    h("div", { class: "cell" }, [
      ...(state.posts.map((post) => h("div", { class: "card", key: post.id, style: { width: "100%", margin: "0rem" } },
        h("div", { class: "card-content p-3" },
          h("div", { class: "row" }, [
            h("div", { class: "cell-md-2" }, post.username + ":"),
            h("div", { class: "cell-md-8", oncreate: (el) => render(el) }, post.content),
            h("div", { class: "cell-md text-right" }, post.date)
          ])
        )
      ))).reverse()
    ])
  )
}

const view = (state, actions) => {
  return h("div", { class: "container", oncreate: () => init(actions.update), style: { marginTop: "1rem" } },
    h("div", { class: "grid" }, [
      Title(),
      Form({ state, actions }),
      List({ state })
    ])
  )
}

app(state, actions, view, document.getElementById("root"))

const init = (update) => {
  db.ref("posts").on("child_added", (response) => {
    const post = { ...response.val(), id: response.key }
    update(post)
  })
}

const render = (el) => {
  renderMathInElement(el, {
    delimiters: [
      { left: "$", right: "$", display: false }
    ],
    throwOnError: false
  })
}