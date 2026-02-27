@echo off
echo ===============================================
echo   野球スコア記録アプリ - クイックテスト
echo ===============================================
echo.
echo ローカルサーバーを起動します...
echo ブラウザで http://localhost:8000 を開いてください
echo.
echo [重要] 確認事項:
echo 1. F12 → Application → Service Workers
echo 2. Status: "activated and running" を確認
echo 3. Cache Storage → baseball-score-v2 をチェック
echo 4. Network → Offline でリロード → 表示されればOK
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo.
echo ===============================================
echo.

REM py コマンドを優先（Python Launcher）
py -m http.server 8000 2>nul
if errorlevel 1 (
  echo py コマンドが見つかりません。python を試します...
  python -m http.server 8000
)
