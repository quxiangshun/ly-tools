; 自定义 NSIS 安装脚本 - 强制创建桌面快捷方式
!macro customInstall
  CreateShortCut "$DESKTOP\栾媛小工具.lnk" "$INSTDIR\栾媛小工具.exe" "" "$INSTDIR\栾媛小工具.exe" 0
!macroend

; 卸载时删除桌面快捷方式
!macro customUnInstall
  Delete "$DESKTOP\栾媛小工具.lnk"
!macroend
