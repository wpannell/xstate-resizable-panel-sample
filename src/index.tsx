import "./styles.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";
import { inspect } from "@xstate/inspect";

// inspect({
//   iframe: false
// });

interface ResizeContext {
  width: number;
  prevWidth: number;
  defaultWidth: number;
  height: number;
  prevHeight: number;
  defaultHeight: number;
  ref: React.MutableRefObject<HTMLElement>;
}

const resizeMachine = createMachine<ResizeContext>(
  {
    id: "Resizable panel",
    context: {} as any,
    type: "parallel",
    states: {
      drag: {
        initial: "idle",
        states: {
          idle: {
            on: {
              pointerdown: {
                target: "dragging"
              }
            }
          },
          dragging: {
            tags: ["dragging"],
            invoke: {
              src: "cancel"
            },
            entry: [
              "setPointerCapture",
              assign({
                prevWidth: (ctx) => ctx.width,
                prevHeight: (ctx) => ctx.height
              })
            ],
            on: {
              "pointermove.x": {
                actions: "updateWidth"
              },
              "pointermove.y": {
                actions: "updateHeight"
              },
              pointerup: {
                target: "idle",
                actions: "releasePointerCapture"
              },
              pointercancel: {
                target: "idle",
                actions: "releasePointerCapture"
              },
              pointerout: {
                target: "idle",
                actions: "releasePointerCapture"
              },
              cancel: {
                target: "idle",
                actions: assign({
                  width: (ctx) => ctx.prevWidth,
                  height: (ctx) => ctx.prevHeight
                })
              }
            }
          }
        }
      },
      collapse: {
        initial: "normal",
        states: {
          normal: {
            // always: {
            //   cond: (ctx) => ctx.size < 100,
            //   target: "collapsed"
            // }
          },
          collapsed: {
            tags: ["collapsed"]
            // always: {
            //   cond: (ctx) => ctx.size >= 100,
            //   target: "normal"
            // }
          }
        }
      }
    },
    on: {
      "reset.x": {
        actions: assign({
          width: (ctx) => ctx.defaultWidth
        })
      },
      "reset.y": {
        actions: assign({
          height: (ctx) => ctx.defaultHeight
        })
      }
    }
  },
  {
    services: {
      cancel: () => (sendBack) => {
        const handler = (e) => {
          if (e.key === "Escape") {
            sendBack("cancel");
          }
        };
        window.addEventListener("keydown", handler);

        return () => {
          window.removeEventListener("keydown", handler);
        };
      }
    }
  }
);

function App() {
  const ref = React.useRef(null);
  const [state, send, actor] = useMachine(resizeMachine, {
    context: {
      ref,
      width: 400,
      prevWidth: 400,
      height: 400,
      prevHeight: 400,
      defaultWidth: 400,
      defaultHeight: 400
    },
    actions: {
      setPointerCapture: (_, e) => {
        e.target.setPointerCapture(e.pointerId);
      },
      releasePointerCapture: (ctx, e) => {
        e.target.releasePointerCapture(e.pointerId);
      },
      updateWidth: assign({
        width: (ctx, e) => {
          const left = ctx.ref.current.getBoundingClientRect().left;
          const { clientX } = e;

          const desiredWidth = clientX - left;

          return desiredWidth;
        }
      }),
      updateHeight: assign({
        height: (ctx, e) => {
          const bottom = ctx.ref.current.getBoundingClientRect().bottom;
          const { clientY } = e;

          const desiredHeight = bottom - clientY;

          return desiredHeight;
        }
      })
    },
    devTools: true
  });

  window.resizeActor = actor;

  const isCollapsed = state.hasTag("collapsed");
  const isDragging = state.hasTag("dragging");

  return (
    <div className="App">
      <h1>Resizable panel</h1>
      <pre style={{ fontSize: "3rem" }}>
        {JSON.stringify(state.value, null, 2)}
      </pre>
      <pre style={{ textAlign: "left", fontSize: "2rem" }}>
        width: {state.context.width}
        <br />
        height: {state.context.height}
        <br />
      </pre>
      <div
        ref={ref}
        className="resizable-panel"
        style={{
          width: isCollapsed ? 0 : `${state.context.width}px`,
          height: isCollapsed ? 0 : `${state.context.height}px`,
          minWidth: isCollapsed ? 0 : "20vw",
          minHeight: isCollapsed ? 0 : "20vh",
          padding: isCollapsed ? "1px" : "1rem",
          background: "#111",
          fontWeight: "bold",
          fontFamily: "sans-serif",
          color: "white",
          boxShadow: "0 .5rem 1rem #0003",
          position: "fixed",
          bottom: 0,
          left: 0
        }}
      >
        <div
          className="handle"
          style={{
            position: "absolute",
            height: "100%",
            width: ".5rem",
            top: 0,
            left: "100%",
            // cursor: "ew-resize"
            cursor: isDragging ? "ew-resize" : "col-resize"
          }}
          onPointerDown={send}
          onPointerMove={(e) => {
            send({
              ...e,
              type: "pointermove.x"
            });
          }}
          onPointerUp={send}
          onPointerCancel={send}
          onPointerOut={send}
          onDoubleClick={() => send("reset.x")}
        ></div>
        <div
          className="handle"
          style={{
            position: "absolute",
            width: "100%",
            height: ".5rem",
            bottom: "100%",
            left: 0,
            cursor: isDragging ? "ns-resize" : "row-resize"
          }}
          onPointerDown={send}
          onPointerMove={(e) => {
            send({
              ...e,
              type: "pointermove.y"
            });
          }}
          onPointerUp={send}
          onPointerCancel={send}
          onPointerOut={send}
          onDoubleClick={() => send("reset.y")}
        ></div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
