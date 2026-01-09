# FW: RE: RE: 복합동 FDCS자료 공유드립니다.

- **From**: 서성현
- **Date**: Unknown Date
- **Source**: FW_ RE_ RE_ 복합동 FDCS자료 공유드립니다_ (80).msg

---

소장님

이게 오래되서 기억이 가물가물하네요.

내용보시고 전화좀 부탁드려요.

 

--------- **Original Message** ---------

**Sender** : 서성현 <sunghyun.seo@samsung.com> AE/전자 P5-PJT 복합동/설계/구조/삼성엔지니어링

**Date** : 2023-10-27 15:09 (GMT+09:00)

**Title** : RE: RE: 복합동 FDCS자료 공유드립니다.

 

수신 : 김태균 프로님 / 삼성전자

안녕하세요

우선 PSRC 기둥 SR-COM Ratio 작성시 서식 오류가 있어 

지적하신것과 같이 SR-COM = SR-Axial => SR-COM = ( Axial capacity Ratio , Biaxial capacity Ratio ) 중 큰 값으로 수정하여 재송부 드립니다. 

SR-Ratio 산출 기준은 아래와 같습니다.

< 기 전자에서 접수한 구조 DB 작성 양식 >  

|  |  |
| --- | --- |
| SR-AXL | 부재응력비 - 축력 |
| SR-MOM | 부재응력비 - 모멘트 |
| SR-COM | 부재응력비 - 조합응력 고려항,(2020.0.27 수정, RC기둥의 경우 Moment와 축력 값 Ratio중 큰값,                    철골설계시는 부재 design ratio 입력), 축력+모멘트 (2020.02.26 추가-철골부재 설계시 고려사항) |
| SR-SHR | 부재응력비 - 전단 |

\* PSRC 작성시 SR-Ratio  < 기둥 P-M Curve 고려 >

SR-AXL   :  Axial capacity Ratio ( Pu/ΦPnx , Pu/ΦPny ) 중 큰 값.

SR-MOM :  Biaxial capacity Ratio - Mux/ΦMnx+Muy/ΦMny  2축휨 고려 

SR-COM :  기존 Axial capacity Ratio  수정 -->  ( Axial capacity Ratio , Biaxial capacity Ratio ) 중 큰 값

SR-SHR :  Shear force ratio ( Vux/ΦsVnx , Vux/ΦsVnx ) 중 큰 값.

상기 PSRC Ratio산출방식이 구조DB 요청된 의도와 차이가 있다면 의견 주시면 반영하여 다시 송부드리겠습니다.

요청하신 PSRC 기둥 계산근거도 함께 첨부하였습니다.

감사합니다.

--------- **Original Message** ---------

**Sender** : 김태균 <tkk.kim@samsung.com>건설기획그룹(글로벌 제조&인프라총괄)/삼성전자

**Date**   : 2023-10-26 15:42 (GMT+9)

**Title**  : RE: 복합동 FDCS자료 공유드립니다.

 

안녕하세요 건설기획그룹 김태균입니다.

이경수 그룹장님, 서성현 AE님.

PSRC 및 LFC 기둥에 대한 SR-Ratio 산출 기준 및 계산서 샘플 공유부탁드립니다.

FAB 11F H-형강은 AISC Steel 계산식으로 계산된것으로 보입니다.

그러나 PSRC 및 LFC는 콘크리트 P-M Curve 로 예상되나,

LFC의 경우 SR-COM = SR-MOM 으로 산출하였고 PSRC는 SR-COM = SR-Axial로 산출하였습니다.

따라서 각 부재에 대한 산출 기준 및 샘플 계산서 공유부탁드립니다.

감사합니다.

  

--------- **Original Message** ---------

**Sender** : 이경수 <ks1838.lee@samoo.com> EM/그룹장/하이테크3본부/삼우종합건축사사무소

**Date**   : 2023-10-26 13:37 (GMT+9)

**Title**  : 복합동 FDCS자료 공유드립니다.

 

안녕하세요. 김태균프로님

삼우설계 이경수마스터입니다. 

첨부와 같이, 엔지니어링의 서성현수석님께서 제공해준 복합동 FDCS자료 공유드립니다. 

내용 검토부탁드립니다.

이경수올림

 

 

 

 

 

|  |  |
| --- | --- |
|  | **Sung Hyun, Seo** |
| **Principal Engineer** ㅣ 건축구조기술사 ㅣ Industrial Engineering Dept. |
| **Samsung Engineering Co., Ltd.** |
| T  82 2 2053 3670     M  82 10 9984 4428     E  [sunghyun.seo](mailto:sunghyun.seo@samsung.com)[@samsung.com](mailto:sunghyun.seo@samsung.com) |

 

 

 

|  |  |
| --- | --- |
|  | 서 성 현 프로 / 건축구조기술사  Sung-Hyun Seo   Structural Engineer / E&I Structural&Civil ENG Group  Samsung E&A  CO., LTD.  Mobile : +82-10-9984-4428 / Office : +82-2-2053-3670  e-Mail : sunghyun.seo@samsung.com |
|  | |

|  |
| --- |
|  |

|  |
| --- |
|  |

|  |
| --- |
|  |
