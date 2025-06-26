//@version=5
indicator("MACD Cross Alert", overlay=true)

[macdLine, signalLine, _] = ta.macd(close, 12, 26, 9)
macdCrossUp = ta.crossover(macdLine, signalLine)
macdCrossDown = ta.crossunder(macdLine, signalLine)

plotshape(macdCrossUp, title="MACD Golden Cross", location=location.belowbar, color=color.green, style=shape.labelup, text="GC")
plotshape(macdCrossDown, title="MACD Dead Cross", location=location.abovebar, color=color.red, style=shape.labeldown, text="DC")

alertcondition(macdCrossUp, title="MACD GC Alert", message="🔔 任天堂がゴールデンクロスしました")
alertcondition(macdCrossDown, title="MACD DC Alert", message="⚠️ 任天堂がデッドクロスしました")
