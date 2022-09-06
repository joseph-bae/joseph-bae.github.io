import pandas as pd
import numpy as np
import sys
import BaeBall as bb
from sklearn.linear_model import LogisticRegression
import warnings
warnings.filterwarnings("error")
import numpy.random
import statsapi
import os
import datetime
from sklearn.preprocessing import MinMaxScaler
import requests
import urllib
import json
import shutil
if __name__=='__main__':
	day=datetime.date.today()
	DoubleThresh=0
	placeHolderPath='refFiles/backup.png'
	#Previously generated training data. See "train_data_generator.ipynb"
	MatchupTrainData=pd.read_csv('refFiles/Matchup_TrainingData.csv')
	NoMatchupTrainData=pd.read_csv('refFiles/NoMatchup_TrainingData.csv')


	#Features of interest for our two models
	MatchupCols=['AVG', 'OBP', 'SLG',
	       'Contact% (pi)', 'Home', 'MatchupAverage',
	       'BallparkNumber', 'era', 'h9', 'k9', 'whip', 'avg',
	        'Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5',]
	NoMatchupCols=['AVG', 'OBP', 'SLG',
	       'Contact% (pi)', 'Home', 
	       'BallparkNumber', 'era', 'h9', 'k9', 'whip', 'avg',
	        'Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5',]

	SelectedMatchup=MatchupTrainData[MatchupCols]
	SelectedNoMatchup=NoMatchupTrainData[NoMatchupCols]

	#Scaling features
	Scaler=MinMaxScaler()
	ScaledSelectedMatchup=pd.DataFrame(Scaler.fit_transform(SelectedMatchup),columns=MatchupCols)
	Scaler=MinMaxScaler()
	ScaledSelectedNoMatchup=pd.DataFrame(Scaler.fit_transform(SelectedNoMatchup),columns=NoMatchupCols)

	#Training models
	Matchup_Model=LogisticRegression(solver='saga',max_iter=4000,random_state=12)
	TrainedMatchupModel=Matchup_Model.fit(ScaledSelectedMatchup,MatchupTrainData['TestLabels'])
	NoMatchup_Model=LogisticRegression(solver='saga',max_iter=4000,random_state=12)
	TrainedNoMatchupModel=NoMatchup_Model.fit(ScaledSelectedNoMatchup,NoMatchupTrainData['TestLabels'])
	print('Getting Data for ' + str(day))
	#Getting test data for date of interest
	MatchupTestData,matchup_log,matchup_progress_dfs=bb.get_feature_matrix(number_of_batters=200,date=str(day),
	                                                number_of_games=5,GetMatchupValues=1,train=0)
	NoMatchupTestData,nomatch_uplog,nomatchup_progress_dfs=bb.get_feature_matrix(number_of_batters=200,date=str(day),
	                                                  number_of_games=5,GetMatchupValues=0,train=0)

	#Scaling test data
	Scaler=MinMaxScaler()
	ScaledMatchupTestData=pd.DataFrame(Scaler.fit_transform(MatchupTestData[MatchupCols]),columns=MatchupCols)
	Scaler=MinMaxScaler()
	ScaledNoMatchupTestData=pd.DataFrame(Scaler.fit_transform(NoMatchupTestData[NoMatchupCols]),columns=NoMatchupCols)
	print('Making Predictions')
	#Predicting using models
	MatchupProbs=TrainedMatchupModel.predict_proba(ScaledMatchupTestData)[:,1]
	NoMatchupProbs=TrainedNoMatchupModel.predict_proba(ScaledNoMatchupTestData)[:,1]

	#Creating prediction dataframes. These list probabilities for all n players in the test data
	MatchupDF=pd.DataFrame()
	MatchupDF['Players']=MatchupTestData.Name.values
	MatchupDF['Team']=MatchupTestData.Team.values
	MatchupDF['Probabilities']=MatchupProbs

	MatchupDF=MatchupDF.sort_values(by='Probabilities',ascending=False)

	NoMatchupDF=pd.DataFrame()
	NoMatchupDF['Players']=NoMatchupTestData.Name.values
	NoMatchupDF['Team']=NoMatchupTestData.Team.values
	NoMatchupDF['Probabilities']=NoMatchupProbs

	NoMatchupDF=NoMatchupDF.sort_values(by='Probabilities',ascending=False)

	CombinedDF=pd.concat((MatchupDF.iloc[0:10,:],NoMatchupDF.iloc[0:10,:]),axis=0,keys=['Matchup','No Matchup'])
	CombinedDF=CombinedDF.sort_values(by='Probabilities',ascending=False)
	CombinedDF=CombinedDF.drop_duplicates(subset='Players',keep='first')
	CombinedDF=CombinedDF.droplevel(level=1)
	CombinedDF.index.name="Model"
	# outImagePath='/content/drive/MyDrive/BeatingTheStreak/TestOutImages'
	picURL='https://img.mlbstatic.com/mlb-photos/image/upload/w_1500,q_100/v1/people/{BatterID}/action/hero/current'
	opener = urllib.request.build_opener()
	opener.addheaders = [('User-agent', 'Mozilla/5.0')]
	urllib.request.install_opener(opener)
	dictList=[]
	date=datetime.datetime.now().strftime("%B %d, %Y")
	time=datetime.datetime.now().strftime("%H:%S")
	timeDict={"Date":date,"Time":time}
	dictList.append(timeDict)
	for i,(row_i, row) in enumerate(CombinedDF.iterrows()):
	  if i==5:
	    break
	  currentDict={}
	  if row_i=='Matchup':
	    BatterID=(MatchupTestData.loc[MatchupTestData['Name']==row['Players'],'BatterIDs'].values[0])

	  else:
	    BatterID=(NoMatchupTestData.loc[NoMatchupTestData['Name']==row['Players'],'BatterIDs'].values[0])
	  currentURL=picURL.format(BatterID=BatterID)
	  try:
	      urllib.request.urlretrieve(currentURL, str(i+1)+'__playerImage.png')
	  except Exception as e:
	    shutil.copyfile(placeHolderPath,str(i+1)+'__playerImage.png')
	  PlayerName=(row['Players'])
	  Prob=(row['Probabilities'])
	  Prob=str(np.round(Prob*100,2))+"%"  
	  currentDict['Name']=PlayerName
	  currentDict['Prob']=Prob
	  dictList.append(currentDict)
	DictTuple=tuple(dictList)

	with open('Preds.json', 'w') as outfile:
	    json.dump(DictTuple, outfile,indent=4)

