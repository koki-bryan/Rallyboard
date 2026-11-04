import os
import tempfile
import unittest

file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
file.close()
os.environ['DATABASE_URL'] = 'sqlite:///' + file.name
import main

class FlowTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        main.engine.dispose()
        os.unlink(file.name)

    def setUp(self):
        main.Base.metadata.drop_all(main.engine)
        main.Base.metadata.create_all(main.engine)
        self.db = main.SessionLocal()
        self.players = [main.User(name=n, email=n.lower()+'@example.com', password_hash='test') for n in ('Floyd','Sean','Coach')]
        self.db.add_all(self.players)
        self.db.commit()
        self.event = main.Event(name='Club', best_of=5, created_by=self.players[2].id)
        self.db.add(self.event)
        self.db.commit()
        self.match = main.Match(event_id=self.event.id, player1_id=self.players[0].id, player2_id=self.players[1].id)
        self.db.add(self.match)
        self.db.commit()

    def tearDown(self): self.db.close()

    def test_event_password_unlocks_score_entry_for_non_player(self):
        scorer = main.User(name='Scorekeeper', email='score@example.com', password_hash='test')
        self.db.add(scorer)
        self.db.commit()
        self.players[2].role = 'coach'
        self.db.commit()
        created = main.create_event(main.EventIn(name='New event', best_of=5, event_password='clubsecret'),
            self.db, self.players[2])
        event_id = created['id']
        self.assertEqual(self.db.query(main.Match).filter_by(event_id=event_id).count(), 0)
        main.add_player(event_id, main.AddPlayerIn(name='Floyd'), self.db, self.players[2])
        main.add_player(event_id, main.AddPlayerIn(name='Sean'), self.db, self.players[2])
        self.assertEqual(main.generate_schedule(event_id, self.db, self.players[2]), {'matches': 1})
        fixture = self.db.query(main.Match).filter_by(event_id=event_id).one()
        result = main.ResultIn(sets=[(11, 2), (11, 3), (11, 4)])
        with self.assertRaises(main.HTTPException) as denied:
            main.submit_result(fixture.id, result, self.db, scorer)
        self.assertEqual(denied.exception.status_code, 403)
        with self.assertRaises(main.HTTPException) as wrong:
            main.join_event(event_id, main.EventPasswordIn(password='wrongpassword'), self.db, scorer)
        self.assertEqual(wrong.exception.status_code, 403)
        self.assertEqual(main.join_event(event_id, main.EventPasswordIn(password='clubsecret'), self.db, scorer), {'can_score': True})
        self.assertEqual(main.submit_result(fixture.id, result, self.db, scorer), {'ok': True})
        self.assertEqual(fixture.submitted_by, scorer.id)
        self.assertEqual(len(self.db.query(main.Participant).filter_by(event_id=event_id).all()), 2)

    def test_random_round_robin_covers_pairs_without_round_conflicts(self):
        for count in (2, 3, 4, 5, 6):
            schedule = main.round_robin_schedule(list(range(count)))
            pairs = {(a, b) for _, a, b in schedule}
            self.assertEqual(len(schedule), count * (count - 1) // 2)
            self.assertEqual(len(pairs), len(schedule))
            for round_number in {r for r, _, _ in schedule}:
                players = [p for r, a, b in schedule if r == round_number for p in (a, b)]
                self.assertEqual(len(players), len(set(players)))

    def test_score_validation_and_standings(self):
        with self.assertRaises(main.HTTPException):
            main.validate_result(main.ResultIn(sets=[(11,2),(12,9),(11,5)]),self.match,5)
        result = main.ResultIn(sets=[(11,2),(9,11),(11,5),(12,10)])
        self.assertEqual(main.validate_result(result,self.match,5),self.players[0].id)
        main.save_result(self.db,self.match,result,self.players[0],'before_submission')
        rows = main.standings([p.id for p in self.players[:2]],{p.id:p.name for p in self.players[:2]},[self.match])
        self.assertEqual(rows[0]['name'],'Floyd')
        self.assertEqual(rows[0]['points_won'],43)
        self.assertEqual(self.event.status,'complete')
        main.save_result(self.db,self.match,main.ResultIn(sets=[(2,11),(4,11),(5,11)]),self.players[2],'before_correction')
        self.assertEqual(self.match.submitted_by,self.players[0].id)
        self.assertEqual(main.standings([p.id for p in self.players[:2]],{p.id:p.name for p in self.players[:2]},[self.match])[0]['name'],'Sean')
        self.assertGreater(len(self.db.query(main.Audit).all()),2)

if __name__ == '__main__': unittest.main()
